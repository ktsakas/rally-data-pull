"use strict";

var program = require('commander');

var args = program
	.command('runserver', 'run server to recieve webhooks')
	.command('pull', 'pull all data from rally (will take a while)')
	.command('sethooks', 'create new webhooks on rally and remove previous ones.')
	.parse(process.argv);

program.outputHelp();