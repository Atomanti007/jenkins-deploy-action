require('dotenv').config();
const fetch = require('node-fetch');
const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
    const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');
    const TENOR_TOKEN = core.getInput('TENOR_TOKEN') || process.env.TENOR_TOKEN;
    const message = core.getInput('message') || 'Thank you!';
    const searchTerm = core.getInput('searchTerm') || 'thank you';

    console.log('RUN');
    console.log(core.getInput('repository'));



    const { context = {} } = github;
    const { pull_request } = context.payload;

    if ( !pull_request ) {
        throw new Error('Could not find pull request! ')
    };

    console.log(`Found pull request: ${pull_request.number}`);

}

run().catch(e => core.setFailed(e.message));
