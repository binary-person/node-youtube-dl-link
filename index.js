var downloader = require('./node_modules/youtube-dl/lib/downloader.js');
var request = require('request');
var app = require('express')();

var port = process.env.PORT || 8080;

function update() {
    return new Promise(function(resolve, reject) {
        downloader(null, function(err, done) {
            'use strict';
            if (err) { return console.log(err.stack); }
            console.log(done);
            resolve();
        });
    });
}

function getInfo(url, youtubedl, callback) {
    var options = ["-f best"];
    youtubedl.getInfo(url, options, function(err, info) {
        if (err) {
            console.log('Error getting url ' + url + ': ' + err);
            callback(null, null, err);
            return;
        }
        var format = info._filename.split('.');
        format = '.' + format[format.length - 1];
        callback(info.url, info.title, null, format);
    });
}

function generateHTMLLink(url, title, format, original) {
    return `<a href='${url.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}' download='${title.replace(/\\/g, "\\\\").replace(/'/g, "\\'")+format}'>${title}</a>
    <br>
    <a target="_blank" rel="noopener noreferrer" href='${original.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'>Raw link</a>`;
}

(async function() {
    var youtubedl = require('youtube-dl');
    
    console.log('Downloading newest version of youtube-dl');
    await update();
    
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });
    
    app.get('/', function(req, res) {
        res.send(`<html>
    <head>
        <title>Youtube Link Extractor</title>
    </head>
    <body>
        <div style="text-align: center; margin-top: 5%">
            <h1>Youtube Link in Highest Quality</h1>
            <h5>By Simon Cheng, special thanks to the awesome <a href="https://github.com/przemyslawpluta/node-youtube-dl">youtube-dl library</a></h5>
            <h4>The official repo is now here! <a href='https://github.com/scheng123/node-youtube-dl-link'>https://github.com/scheng123/node-youtube-dl-link</a></h4>
            <h3>Insert link below!</h3>
            <input id="urlField" type="text" placeholder="Youtube Link" style="width: 40%; height: 3.5%;"/>
            <button onclick="var result = document.getElementsByTagName('iframe')[0], xhttp = new XMLHttpRequest(); result.contentDocument.body.setAttribute('style', 'text-align: center'); result.contentDocument.body.innerHTML = '<h3>Loading...</h3>'; xhttp.onerror = function(e){console.log(e); result.contentDocument.body.innerHTML = 'Could not connect to server'}; xhttp.onload = function(){result.contentDocument.body.innerHTML = xhttp.responseText}; xhttp.open('GET', '/gui?url='+window.encodeURIComponent(document.getElementById('urlField').value), true); xhttp.send();">Get link</button>
            <br>
            <br>
            <iframe style='border: none; width: 70%; height: 30%'></iframe>
            <script>document.addEventListener('keydown', function(e){
                if(!e.ctrlKey && !e.altKey && !e.shiftKey && e.key == 'Enter') document.getElementsByTagName('button')[0].click();
            });</script>
        </div>
    </body>
</html>
`);
    });
    app.get('/gui', function(req, res) {
        if (!req.query.url) {
            res.send('No url provided');
            return;
        }
        getInfo(req.query.url, youtubedl, function(url, title, err, format) {
            if (err) {
                res.send('' + err);
                return;
            }
            res.send(generateHTMLLink('/rerouteVid?fileURL=' + encodeURIComponent(url) + '&fileName=' + title + format, title, format, url));
        });
    });
    app.get('/rerouteVid', function(req, res) {
        if (!req.query.fileURL) {
            res.send('No file url provided');
            return;
        }
        res.setHeader('Content-disposition', 'attachment; filename=' + (req.query.fileName ? req.query.fileName : 'file'));
        res.setHeader('Content-type', 'application/octet-stream');
        request.get(req.query.fileURL).pipe(res);
    });
    app.get('/api', function(req, res) {
        var result = {};
        res.setHeader('Content-Type', 'application/json');
        if (!req.query.url) {
            result.success = false;
            result.description = 'No url param provided'
            res.send(JSON.stringify(result, null, 4));
            return;
        }
        getInfo(req.query.url, youtubedl, function(url, title, err, format) {
            if (err) {
                result.success = false;
                result.description = err;
                res.send(JSON.stringify(result, null, 4));
                return;
            }
            result.success = true;
            result.title = title;
            result.url = url;
            result.fileName = title + format;
            res.send(JSON.stringify(result, null, 4));
        })
    });
    app.listen(port, () => console.log('\nApp listening on port ' + port + '!'));
})();
