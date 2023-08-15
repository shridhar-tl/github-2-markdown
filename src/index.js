//const { loadIssuesListFromGitHub } = require('./github');
const path = require('path');
const fs = require('fs-extra');
const { generateDocuments } = require('./generator');
const { execSync } = require('node:child_process');

const configPath = getArgs('--config');

if (!configPath) {
    throw new Error('Config path not provided');
}

const configFilePath = path.join(process.cwd(), configPath);

if (!fs.existsSync(configFilePath)) {
    throw new Error(`Config file does not exists in path ${configFilePath}`);
}

const config = fs.readJSONSync(configFilePath);

console.log('Config file loaded');

generateDocuments({ ...config }).then(result => {
    if (result.isSuccess) {
        console.log(`Completed generating/updating ${result.filesCount} documents`);
    } else {
        console.log(`Process failed after generating/updating ${result.filesCount} documents`);
    }

    if (result.filesCount && result.lastTimeStamp instanceof Date) {
        config.lastTimeStamp = result.lastTimeStamp;
        fs.writeJSONSync(configFilePath, config, { spaces: 4 });

        if (config.autoCommit) {
            console.log('Committing all files and pushing the change back to repository');
            execSync('git add --all');
            execSync('git commit -m "Updated cached markdown files"');
            execSync('git push');
        }
    }
});


function getArgs(key) {
    const args = process.argv;
    const valueIndex = args.indexOf(key) + 1;

    if (!valueIndex) {
        return;
    }

    if (valueIndex > args.length) {
        return;
    }

    return args[valueIndex];
}