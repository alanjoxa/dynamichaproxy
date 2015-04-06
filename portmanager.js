var fs = require('fs'),
    path = require('path'),
    defaultLocation = __dirname + '/tempfiles/';

module.exports = {
    getPort : function (port) {
        var content = getData();
        port = port || content.unusedPorts.pop() || getNewPort(content);
        content.usedPorts.push(+port);
        updateData(content);
        return port;
    },

    addUnused : function(port) {
        var content = getData();
        content.unusedPorts.push(+port);
        content.usedPorts = content.usedPorts.filter(function(x){return x != +port});
        updateData(content);
    },

    getPortConfig : function(port) {
        return {
            port : port,
            httpPort : port,
            terminalPort : port - 1000,
            httpsPort : port - 2000,
            sshPort : port - 3000
        };
    }
}

function getNewPort(content) {
    var port = content.currentPort++;
    while(content.usedPorts.indexOf(port) > -1) port = content.currentPort++;
    return port
}

function getData() {
    var content = { 
        currentPort : 8000,
        unusedPorts : [],
        usedPorts : []
    };
    updateData(content);
    getData = function() {
        return JSON.parse(fs.readFileSync(path.join(defaultLocation, 'proxyconfig.json'), 'utf8'));
    }
    return content;
}

function updateData(content) {
    fs.writeFileSync(path.join(defaultLocation, 'proxyconfig.json'), JSON.stringify(content));
}

/*
I know there is no point in writing this content to file, but just keeping it for a better debug is there any issue. 
Its justa temp file. :)
*/