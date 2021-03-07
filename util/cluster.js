require("colors");
const cluster = require('cluster');
const isMaster = cluster.isMaster;
const express = require('express');
const moment = require('moment');
const fs = require('fs');
const cmd = require("./cmd.js")
let appDirectory = require('path').dirname(process.pkg ? process.execPath : (require.main ? require.main.filename : process.argv[0]));

let args = {
    logToFile: true,
    path: appDirectory + '/power.log',
    workers: 2,
    master: () => {},
    worker: () => {},
    autoRestart: true,
};

// set text color to italy's flag
let italy = str => {
    let out = '';
    let cur = 0;
    for (let i = 0; i < str.length; i++) {
        let char = str.charAt(i);
        if (char !== ' ')
            switch (cur) {
                case 0:
                    out += char.green;
                    cur++;
                    break;
                case 1:
                    out += char.white;
                    cur++;
                    break;
                case 2:
                    out += char.red;
                    cur = 0;
                    break;
            }
        else
            out += char;
    }
    return out;
};

// set italy's color to string prototype
Object.defineProperty(String.prototype, 'italy', {
    get: function () {
        return italy(this);
    }
});

let logToFile = content => {
    let out = `[${moment().format('YY-MM-DD H:mm:ss:SSS')}] ${content}\n`;
    let output = out.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    const stream = fs.createWriteStream(args.path, {flags: 'a'});
    stream.write(output);
};
// `${isMaster ? `Master` : `Cluster ${cluster.worker.id}`}`
const log = text => {
    const output = `${isMaster ? `Master`.cyan : `Cluster ${cluster.worker.id}`.cyan}: ${text}`;
    console.log(output);
    if (args.logToFile) logToFile(output);
};

const master = async ({ workers, master, autoRestart }) => {
    master();

    cluster.on('online', (worker) => {
        cmd.success(`Cluster ${worker.id} is online`, `${isMaster ? `Master` : `Cluster ${cluster.worker.id}`}`)
    });

    cluster.on('exit', (worker, exitCode) => {
        cmd.error(`Cluster ${worker.id} is exited with code ${exitCode}`, `${isMaster ? `Master` : `Cluster ${cluster.worker.id}`}`);
        if (autoRestart) {
            cmd.info(`Auto-Restart: New cluster in place of ${worker.id}`, `${isMaster ? `Master` : `Cluster ${cluster.worker.id}`}`);
            cluster.fork();
        }
    })

    process.on('close', () => {
        cmd.error('App is offline', `${isMaster ? `Master` : `Cluster ${cluster.worker.id}`}`);
        process.exit();
    });

    process.on('SIGINT', () => {
        cmd.error('App is offline', `${isMaster ? `Master` : `Cluster ${cluster.worker.id}`}`);
        process.exit();
    });

    for (let i = 0; i < (workers || 1); i++) cluster.fork();
}

const worker = async ({ port, worker }) => {
    const app = new express();

    app.use((req, res, next) => {
        // log(`${req.method} request received at ${req.path}`);
        next();
    });

    worker(app);
};

const load = (options = {}) => {
    args = {...args, ...options};
    if (typeof args.workers !== "number") return cmd.error("Clusters must be a number", "Master");
    if (typeof args.logToFile !== "boolean") return cmd.error("LogToFile must be a boolean", "Master");
    if (typeof args.path !== "string") return cmd.error("Path must be a string", "Master");
    if (isMaster) master(args).then(() => cmd.success("Pre-Check completed.", "Master"));
    else worker(args);
};

module.exports = { load, log, italy };