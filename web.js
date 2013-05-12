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
    console.log(raw_data);
    raw_data = raw_data.split("-");
    data = {
        value: raw_data[1],
        id: raw_data[0].indexOf("/") === -1 ? raw_data[0] : raw_data[0].split("/")[0]
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
  res.send({ "message": "POST to /spr with 'ic'."})
});

app.get('/spr', function(req, res, next) {
  res.set('Allow', ['POST']);
  res.send(405, { "message": "Method not allowed" });
  res.end();
});

app.post('/spr', function(req, res, next) {

    if (!req.param('ic')) {
        res.send(400, { "message": "Required parameter: 'ic' "});
        res.end();
        return;
    }

    var data = querystring.stringify({
        txtIC: reg.param,
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
                ic : $('table span#Labelnama').length < 0 ? 'undefined' : $('table span#LabelIC').text(),
                dob : $('table span#Labelnama').length < 0 ? 'undefined' : $('table span#LabelTlahir').text(),
                location: $('table span#Labelnama').length < 0 ? 'undefined' : splitter($('table span#Labellokaliti').text()),
                vote_area: $('table span#Labelnama').length < 0 ? 'undefined' : splitter($('table span#Labeldm').text()),
                dun: $('table span#Labelnama').length < 0 ? 'undefined' : splitter($('table span#Labeldun').text()),
                parliment: $('table span#Labelnama').length < 0 ? 'undefined' : splitter($('table span#Labelpar').text()),
                state: $('table span#Labelnama').length < 0 ? 'undefined' : $('table span#Labelnegeri').text()
            }
            //console.log("Sucessfully send back the data with size " +);
            res.send(result);
        })
    });
    http_client.write(data);
    http_client.end();
});

