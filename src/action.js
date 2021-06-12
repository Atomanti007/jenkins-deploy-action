import dotenv from 'dotenv'
import axios from 'axios';
import qs from 'qs';
import * as _ from 'lodash';
import * as core from '@actions/core';
import * as github from '@actions/github';

dotenv.config();

const USER = core.getInput('user_name');
const TOKEN = core.getInput('api_token');
const JOB_NAME = core.getInput('job_name');
const JENKINS_URL = core.getInput('jenkins_url');
const PARAMETERS = core.getInput('parameter');
const WAIT = core.getInput('wait');
const TIMEOUT = core.getInput('timeout');

let REPOSITORY = core.getInput('repository').substring(core.getInput('repository').indexOf("/") + 1);
let BRANCH = core.getInput('branch') || 'main';


const API_TOKEN = Buffer.from(`${USER}:${TOKEN}`).toString('base64');

let timer = setTimeout(() => {
    core.setFailed("Job Timeout");
    core.error("Exception Error: Timed out");
    process.exit(1);
}, (Number(TIMEOUT) * 1000));

const sleep = (seconds) => {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, (seconds * 1000));
    });
};

async function requestJenkinsJob(jobName, params) {
    let url = `${JENKINS_URL}/job/${jobName}/buildWithParameters`;
    await axios({
        method: 'POST',
        url: url,
        headers: {
            'Authorization': `Basic ${API_TOKEN}`
        },
        data : qs.stringify(params)
    });
}

async function getJobStatus(jobName) {
    const url = `${JENKINS_URL}/job/${jobName}/lastBuild/api/json`;
    return axios.get(url, {
            auth: {
                username: USER,
                password: TOKEN
            }
        }
    )
}

async function waitJenkinsJob(jobName, timestamp) {
    core.info(`>>> Waiting for "${jobName}" ...`);
    while (true) {
        let response = await getJobStatus(jobName);
        let data = response.data;


        if (data.timestamp < timestamp) {
            core.info(`>>> Job is not started yet... Wait 5 seconds more...`)
        } else if (data.result === "SUCCESS") {
            core.info(`>>> Job "${data.fullDisplayName}" successfully completed!`);
            break;
        } else if (data.result === "FAILURE" || data.result === "ABORTED") {
            throw new Error(`Failed job ${data.fullDisplayName}`);
        } else if (data) {
            core.info(`>>> Current Duration: ${data.duration}. Expected: ${data.estimatedDuration}`);
        }
        await sleep(5); // API call interval
    }
}

async function main() {
    try {
        let startTs = +new Date();
        let params = {
            'REPOSITORY': REPOSITORY,
            'BRANCH': BRANCH
        };
        core.info(`>>> Parameter ${JSON.stringify(params)}`);
        // POST API call
        await requestJenkinsJob(JOB_NAME, params);
        core.info(`>>> Job is started!`);

        // Waiting for job completion
        if (WAIT === 'true') {
            await waitJenkinsJob(JOB_NAME, startTs);
        }
    } catch (err) {
        console.log(`${JSON.stringify(err)}`)
        core.setFailed(err.message);
        core.error(err.message);
    } finally {
        clearTimeout(timer);
    }
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
main().catch(e => core.setFailed(e.message));
