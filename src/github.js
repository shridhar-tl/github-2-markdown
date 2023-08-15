const dateTime = require('./utils/date-time');

async function loadIssuesListFromGitHub(config) {
    config = getConfigForApi(config);
    try {
        const issues = await getAllIssuesSince(config);

        return issues.filter(onlyValidIssueTypes).map(formatIssue);
    } catch (err) {
        console.error(`Error fetching IssueList: Message:- ${err.message}; Details:- ${JSON.stringify(err)}`);
    }

    return [];
}

async function getIssueComments(issue) {
    if (!issue.comments) {
        return [];
    }

    const response = await fetch(issue.comments_url);
    const comments = await response.json();

    if (!response.ok) {
        throw new Error(comments.message || comments);
    }

    return comments.map(formatComments);
}

module.exports = { loadIssuesListFromGitHub, getIssueComments };

async function getAllIssuesSince(config) {
    let page = 0;
    let issues, newIssues;

    do {
        page++;

        const remaining = config.max_issues_per_run - (issues?.length || 0);
        if (remaining < config.issuesPerPage) {
            config.issuesPerPage = remaining;
        }

        const issuesUrl = formApiUrl(page, config);

        console.log('About to fetch issues list from:- ', issuesUrl);

        const response = await fetch(issuesUrl);
        const newIssues = await response.json();

        if (!response.ok) {
            throw new Error(newIssues.message || newIssues);
        }

        if (!issues) {
            issues = newIssues;
        } else if (newIssues?.length) {
            issues.push(...newIssues);
        }
    } while (newIssues?.length > 0 && issues?.length < config.max_issues_per_run);

    return issues;
}

function onlyValidIssueTypes(issue) {
    return !issue.pull_request;
}

function formatComments(comment) {
    const { created_at, updated_at, ...others } = comment;

    return {
        ...others,
        created_at: dateTime.parse(created_at),
        updated_at: dateTime.parse(updated_at)
    }
}

function formatIssue(issue) {
    const { created_at, updated_at, closed_at, ...others } = issue;

    return {
        ...others,
        created_at: dateTime.parse(created_at),
        updated_at: dateTime.parse(updated_at),
        closed_at: dateTime.parse(closed_at)
    };
}


function formApiUrl(page, config) {
    let { lastTimeStamp: since, issuesPerPage } = config;

    if (since && since instanceof Date) {
        since = `&since=${since.toISOString()}`;
    } else {
        since = '';
    }

    if (!page) {
        page = '';
    }

    return `https://api.github.com/repos/${config.repoUser}/${config.repoName}/issues?state=all&sort=updated&direction=asc${since}&per_page=${issuesPerPage}&page=${page}`;
}

function getConfigForApi(config) {
    let { lastTimeStamp, max_issues_per_run, source_repository } = config;

    if (!max_issues_per_run) {
        max_issues_per_run = 50;
    }

    const issuesPerPage = max_issues_per_run > 100 ? 100 : max_issues_per_run;

    lastTimeStamp = dateTime.parse(lastTimeStamp);

    if (!source_repository?.trim()) {
        throw new Error('Repository source url is required which is not provided in config');
    }

    const [_, repoUser, repoName] = new URL(source_repository).pathname.split('/');

    return { lastTimeStamp, max_issues_per_run, issuesPerPage, repoUser, repoName };
}