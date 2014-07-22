#!/usr/bin/env node
"use strict";

var cluster = require( 'cluster' ),
	path = require( 'path' );

var opts = require( 'yargs' )
	.default( {
		// By default, start one client per 4 cores
		c: require('os').cpus().length/4
	} )
	.alias( 'c', 'children' ).argv;

if ( !module.parent ) {
	var numClients = opts.c;

	cluster.setupMaster( {
		exec: path.join( __dirname, 'client.js' ),
		args: opts._
	} );

	console.log( "client-cluster initializing", numClients, "clients");
	for ( var i = 0; i < numClients; i++ ) {
		cluster.fork();
	}

	cluster.on( 'exit', function ( worker, code, signal ) {
		if ( !worker.suicide ) {
			var exitCode = worker.process.exitCode;
			console.log( 'client', worker.process.pid,
				'died (' + exitCode + '), restarting.' );
			cluster.fork();
		}
	} );

	var shutdown_cluster = function () {
		console.log( 'client cluster shutting down, killing all clients' );
		var workers = cluster.workers;
		Object.keys( workers ).forEach( function ( id ) {
			console.log( 'Killing client', id );
			workers[ id ].destroy();
		} );
		console.log( 'Done killing clients, exiting client-cluster.' );
		process.exit( 0 );
	};

	process.on( 'SIGINT', shutdown_cluster );
	process.on( 'SIGTERM', shutdown_cluster );
}
