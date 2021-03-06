var express = require('express');
var http = require('http');
var querystring = require('querystring');
var cheerio = require('cheerio');

/*if (!process.env.TO || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  throw new Error("Environment variables TO, SMTP_USER and SMTP_PASS are required");
}
*/

var app = express();
var port = process.env.PORT || 5000;
var spr_url = 'daftarj.spr.gov.my';
var spr_uri = '/DaftarjBM.aspx';

var splitter = function splitter(raw_data){
    raw_data = raw_data.split("-");
    id = raw_data[0].split("/");
    data = {
        value: raw_data[1].trim(),
        id: id.length < 1 ? id.trim()  : id[id.length -1 ].trim()
    }
    return data;
}

process.on('SIGINT', function() {
    console.log("\nGracefully shutting down from SIGINT");
    process.exit();
});

app.use(express.bodyParser());
app.use(function(req, res, next){
    console.log("%s %s %s %s", req.method, req.url, req.ip, req.get('user-agent'));
    next();
});
app.use(function(err, req, res, next){
    console.error(err.stack);
    res.send(500, { error: 'Something blew up!' });
});

app.listen(port, function() {
    console.log("Listening on " + port);
});




app.get('/', function(req, res) {
  res.send({ "message": "GET to /voter/:ic."})
});

app.get('/voter', function(req, res, next) {
    res.send(405, { "message": "Missing the IC, /voters/:ic ." });
    res.end();
});

// /voter/:id/:format
app.get('/voter/:id/:format', function(req, res, next) {

    var data = querystring.stringify({
        txtIC: req.params.id,
        Semak: "Semak",
        __EVENTTARGET : "",
        __EVENTARGUMENT : "",
        __VIEWSTATE : "/wEPDwUKLTg1NDI5MjMzMQ9kFgICAQ9kFgICCg9kFgICAw8PFgIeB1Zpc2libGVoZGRkgZEiFmQ6uz/5h337IazY/oyF6vs=",
       __EVENTVALIDATION: "/wEWAwK5+dHSCAKp+5bqDwKztY/NDtFR5UyKAo2QblF7jIEDO/+NdW/V"
        });

    var options = {
        host: spr_url,
        port: 80,
        path: spr_uri,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': data.length
        }
    };


    var http_client = http.request(options, function(response){

        var str = '';

        response.setEncoding('utf8');
        response.on('data', function (chunk) {
          str+= chunk;
        });

        response.on('error', function(e) {
          console.error(e.message);
          res.send(500, { error: 'Something blew up!' })
        });

        response.on('end', function(){
            $ = cheerio.load(str, {ignoreWhitespace: true});

            var result = {
                name : $('table span#Labelnama').length < 0 ? 'undefined' : $('table span#Labelnama').text(),
                ic : $('table span#LabelIC').length < 0 ? 'undefined' : $('table span#LabelIC').text(),
                dob : $('table span#LabelTlahir').length < 0 ? 'undefined' : $('table span#LabelTlahir').text(),
                location: $('table span#Labellokaliti').length < 0 ? 'undefined' : splitter($('table span#Labellokaliti').text()),
                vote_area: $('table span#Labelnama').length < 0 ? 'undefined' : splitter($('table span#Labeldm').text()),
                dun: $('table span#Labeldun').Labeldm < 0 ? 'undefined' : splitter($('table span#Labeldun').text()),
                parliment: $('table span#Labelpar').length < 0 ? 'undefined' : splitter($('table span#Labelpar').text()),
                state: $('table span#Labelnegeri').length < 0 ? 'undefined' : $('table span#Labelnegeri').text()
            }
            
            // TODO: Not sure this is correct way to detec the format. Check on res.format(function(){})
            if(req.params.format == 'jsonp') {
                res.jsonp(200, result);
            }
            
            res.send(result);

        })
    });

    http_client.write(data);
    http_client.end();

});

