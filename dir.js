var fs = require('fs');
var path = require('path');
var async = require('async');  // npm install async
var _ = require('underscore'); // npm install underscore

// Throttle the filesystem access by sending everything through this async queue 
var WORKERS = 500;
var queue = async.queue(function(task, cc){ task(cc); }, WORKERS); 

var _fs = {}; //internal namespace for throttled fs functions

function throttle(ctx,fn){
    return function(){
	var args = Array.prototype.slice.call(arguments);       //real invocation args
	queue.push(function(qcb){
	    if( args && args.length > 0 && typeof args[args.length-1] == 'function'){
		//wrap original callback to also trigger queue-work-complete callback
		var cb = args[args.length-1];
		args[args.length-1] = function(){
		    qcb();
		    cb.apply(null,arguments); 
		};
	    }
	    fn.apply(ctx,args);
	});
    };
}

function statsdir(dir, cc){
    
    var stats = function (info, scc){
	_fs.stat(info.path, function( err, stats){
	    if(err) scc(err);
	    info.stats = stats;
	    scc(null, info);
	});
    };

    var onreaddir = function(files){
	async.map( files, stats, function(err,infos){
	    if(err) throw err;
	    cc(infos);
	});	
    };
    
    _fs.readdir( dir, function(err, files){
	if(err) throw err;	
	var fileInfo = _.map( files, function( f ){
	    return { file : f, path : path.join(dir,f) };
	});
	onreaddir(fileInfo);
    });
};

function eachdir(dir, cc){
    
    var ondir = function(infos){
	infos.forEach(function( e ){
	    if( e.stats.isDirectory() ){
		eachdir( path.join(dir, e.file), cc);
	    }	    
	    cc( infos );
	});
    };
    
    statsdir(dir, ondir);      
}

//Throttle the async fs calls 
['rename','truncate',
 'chown','fchown','lchown','chmod','fchmod','lchmod',
 'stat','lstat','fstat', 'link','symlink','readlink',
 'realpath','unlink',
 'rmdir','mkdir', 'readdir',
 'close','open','utimes','futimes','fsync',
 'write','read','readFile','writeFile'].forEach(function(p){
     exports[p] = _fs[p] = throttle(fs,fs[p]);
 });

exports.statsdir = statsdir;
exports.eachdir = eachdir;





