const path = require('path');
const fs = require('fs-extra');
const dateTime = require('./utils/date-time');
const { loadIssuesListFromGitHub, getIssueComments } = require('./github');

async function generateDocuments(config) {
    const issues = await loadIssuesListFromGitHub(config);

    return await generateMDFiles(issues, config);
}

module.exports = { generateDocuments };

async function generateMDFiles(issues, config) {
    const { output_path, md_config } = config;
    let { file_name_template, lastTimeStamp } = config;

    lastTimeStamp = dateTime.parse(lastTimeStamp);

    const markdownConfig = prepareMDConfig(md_config);

    if (!file_name_template.endsWith('.md')) {
        file_name_template += '.md';
    }

    const dirPath = path.join(process.cwd(), output_path);

    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    let filesCount = 0;
    let isSuccess = false;

    try {
        for (var issue of issues) {
            const fileName = parseTemplate(file_name_template, issue, markdownConfig);
            const filePath = path.join(dirPath, fileName);

            await generateMDDocument(markdownConfig, issue, filePath);

            filesCount++;

            const curIssueTime = (issue.updated_at || issue.created_at);
            if (!lastTimeStamp || lastTimeStamp.getTime() < curIssueTime.getTime()) {
                lastTimeStamp = curIssueTime;
            }
        }

        isSuccess = true;
    } catch (err) {
        console.error(err.message);
    }

    return {
        filesCount,
        lastTimeStamp,
        isSuccess
    };
}

function prepareMDConfig({ heading_start, dateFormat, ...others }) {
    if (!heading_start || heading_start === 1) {
        heading_start = '#';
    } else {
        heading_start = new Array(heading_start || 1).fill('#').join('');
    }

    if (!dateFormat) {
        dateFormat = 'MMM dd, yyyy';
    }

    return { heading_start, dateFormat, ...others };
}

async function generateMDDocument(md_config, issue, filePath) {
    const {
        number, html_url, user, title, state, comments_url, body,
        created_at, updated_at, closed_at
    } = issue;

    const commentsList = await getIssueComments(issue);
    const comments = formatComments(commentsList, md_config);

    const mdString = `${generateMetadata(md_config.header, issue, md_config)}
${md_config.heading_start} [#${number}](${html_url}) - ${title}

${getCommentTitle(issue, md_config)}

${body}

${comments}
`;

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    fs.writeFileSync(filePath, mdString);
}

function generateMetadata(metadata, data, md_config) {
    const keys = metadata && Object.keys(metadata);

    if (!keys?.length) {
        return '';
    }

    const result = keys.map(k => `${k}: "${parseTemplate(metadata[k], data, md_config)}"`).join('\n');

    return `---\n${result}\n---\n\n`;
}

function formatComments(commentsList, md_config) {
    if (!commentsList?.length) {
        return '';
    }

    return commentsList.map(c => formatComment(c, md_config)).join('\n\n');
}

function formatComment(comment, md_config) {
    return `${getCommentTitle(comment, md_config)}\n\n${comment.body}`;
}

function getCommentTitle(data, md_config) {
    const { heading_start, comment_title_format, dateFormat } = md_config;

    if (comment_title_format) {
        return parseTemplate(comment_title_format, data, md_config);
    } else {
        const dateStr = dateTime.format(data.updated_at || data.created_at, dateFormat);
        return `${heading_start}# [${data.user.login}](${data.user.html_url}) commented on ${dateStr}`;
    }
}

function parseTemplate(template, data, md_config) {
    return template.replace(/({(.+?)})/g, (_, __, txt) => {
        const keys = txt.split('??');

        for (let key of keys) {
            const value = getFieldValue(data, key, md_config);

            if (value) {
                return value;
            }
        }

        return '';
    });
}

function getFieldValue(data, key, md_config) {
    const args = key.split('|');
    const value = getObjValue(data, args[0]);

    return formatValue(value, args[1], md_config);
}

function getObjValue(obj, key) {
    const parts = key.trim().split('.');

    if (parts.length < 2) {
        return obj[parts[0]];
    }

    return parts.reduce((result, cur) => (result?.[cur]), obj);
}

function formatValue(value, arg, md_config) {
    if (!value) {
        return value;
    }

    const args = arg?.split(':');

    if (value instanceof Date) {
        return dateTime.format(value, args?.[0] || md_config?.dateFormat);
    } else if (typeof value === 'string' && args?.length > 1) {
        return formatString(value, args[0], args.slice(1))
    }

    return value;
}

function formatString(str, func, args) {
    switch (func) {
        case 'cut':
        case 'maxlength':
            return str.substring(0, parseInt(args[0]));
        default:
            return str[func](...args);
    }
}