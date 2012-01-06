var path = require('path');
var async = require('async');  // npm install async
var id3 = require('id3');      // npm install id3
var _fs = require('fs-util');
var _ = require('underscore');

var suffix = '\.mp3$';

function writeIndex( dir, tags ){
    console.log('writing index', dir);
    var json = JSON.stringify( tags, null, 2 );
    _fs.writeFile(path.join(dir, 'index.json'), json, function (err) {
	if (err) throw err;
    });
};

function readTag(tags){
    var tag = tags[_.find(_.toArray(arguments).slice(1), function(k){
	return tags[k] ? true : false;
    })];
    return tag ? tag.data : '';
};

function readTags( f, cc ){
    var size = 1000;
    var buf = new Buffer(size);
    _fs.open(f.path, 'r', function(err, fd){
	if (err) throw err;
	_fs.read(fd, buf, 0, size, null, function(err, read, buffer){
	    var id3file = new id3(buffer);
	    id3file.file = f.file;
	    id3file.parse();	    
	    _fs.close( fd );
	    delete id3file.buffer;
	    cc(null, id3file);		
	});
    });
};

function extractTags( id3 ){
    var tags = id3.tags;
    return {
	file : id3.file,
	title : readTag(tags,'TIT2','TT2'),
	album : readTag(tags,'TALB'),
	track : readTag(tags,'TRCK'),
	artist : readTag(tags,'TPE1','TPE2')
    };
};

function createIndex( dir, files){
    async.map(files, readTags, function(err, tags){
	var cleaned = [];
	tags.forEach(function(i){
	    cleaned.push(extractTags( i ));
	});
	writeIndex(dir, cleaned);		
    });	
};
  
function oneachdir(dir, infos){
    var mfiles = [];
    infos.forEach(function(e, fn){
	if( e.stats.isFile() && e.file.match( suffix ) ){
	    mfiles.push( e );
	}
    });    
    createIndex(dir, mfiles);
};

function index( dir ){
    _fs.eachdir(dir, oneachdir);
}

exports.index = index;


