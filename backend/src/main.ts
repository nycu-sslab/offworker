#!/usr/bin/env node

const config = require("./config");

const Server = require('./Server.js')

const port = process.argv[2] || config.port

const server = new Server(config.host, port);
