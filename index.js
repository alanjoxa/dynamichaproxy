
var compiler = require('./compiler'),
 portManager = require('./portmanager'),
 defaultLocation = "./tempfiles/",
 fs = require('fs'),
 path = require('path'),
 _ = require('underscore'),
 haproxy = require('./haproxy');

function init(routeList) {
	//copy the hap config template for the env
	var exec = require('child_process').exec;
	//Creating the tempfiles folder and copyng the proxyserver config
	exec('mkdir -p tempfiles & cp -r hapconfigtemplate/config ' + defaultLocation, function(err, stdout, stderr) {
		if(err||stdout||stderr) console.log(err, stdout, stderr);
		routeList.forEach(function(route){
			add(route.name, null, null, +route.port, true);
		});
		haproxy.init();
	});
}

function add(name, image, cb, port, init) {
    var hapConfig = compiler.getFiles(),
    frontend = hapConfig.frontend,
    secureFrontend = hapConfig.secureFrontend,
    backend = hapConfig.backend;
    port = portManager.getPort(port),
    portConfig = portManager.getPortConfig(port);
    
    frontend.content += "\n" + SSComment(name).start +
     "\n  acl is" + name + " hdr_beg(host) " + name + 
     "\n  use_backend " + name + "_backend if is" + name + 
     "\n  acl is" + name + "terminal hdr_beg(host) " + "terminal-" + name +
     "\n  use_backend " + name + "terminal_backend if is" + name + "terminal" +
     "\n" + SSComment(name).end + "\n";
    
    secureFrontend.content += "\n" + SSComment(name).start +
     "\n  acl is" + name + "secure hdr_beg(host) " + name +
     "\n  use_backend " + name + "secure_backend if is" + name + "secure" +
     "\n" + SSComment(name).end + "\n";

   	backend.content += "\n" + SSComment(name).start + 
    "\nbackend " + name + "_backend\n  balance roundrobin\n  server localhost_" + portConfig.httpPort + " dockerlocalhost:" + portConfig.httpPort + 
    "\nbackend " + name + "secure_backend\n  balance roundrobin\n  server localhost_" + portConfig.httpsPort + " dockerlocalhost:" + portConfig.httpsPort + " ssl verify none" + 
    "\nbackend " + name + "terminal_backend\n  balance roundrobin\n  server localhost_" + portConfig.terminalPort + " dockerlocalhost:" + portConfig.terminalPort + 
    "\n" + SSComment(name).end + "\n";

    fs.writeFileSync(path.join(defaultLocation, 'config/includes/frontend-80'), frontend.content);
    fs.writeFileSync(path.join(defaultLocation, 'config/includes/frontend-443'), secureFrontend.content);
    fs.writeFileSync(path.join(defaultLocation, 'config/includes/backend'), backend.content);

    compiler(hapConfig.files);
    if(!init) { //Expecting the containers are already running
		haproxy.restart(function(){
		    cb && cb(port);
		});
	}
}

function remove(name, port, cb) {
    var hapConfig = compiler.getFiles(),
    frontend = hapConfig.frontend,
    secureFrontend = hapConfig.secureFrontend,
    backend = hapConfig.backend;
    
    frontend.content = removeProxyConf(frontend.content, name);
    secureFrontend.content = removeProxyConf(secureFrontend.content, name);
    backend.content = removeProxyConf(backend.content, name);

    fs.writeFileSync(path.join(defaultLocation, 'config/includes/frontend-80'), frontend.content);
    fs.writeFileSync(path.join(defaultLocation, 'config/includes/frontend-443'), secureFrontend.content);
    fs.writeFileSync(path.join(defaultLocation, 'config/includes/backend'), backend.content);

    compiler(hapConfig.files);
    haproxy.restart(cb);
    portManager.addUnused(port);
}

function removeProxyConf(fileContent, name) {
    var ssc = SSComment(name);
    //#qa1-box-start([\s\S]*?)#qa1-box-end
    var matchExp = new RegExp('\n' + ssc.start + '([\\s\\S]*?)' + ssc.end + '\n', 'gi');
    try {
        fileContent = fileContent.replace(matchExp, '');
    } catch (e) {
        console.log('failed to remove hap config for this box');
    }
    return fileContent;
}

function SSComment(name) {
    return {
        start : "#" + name + "-box-start",
        end : "#" + name + "-box-end"
    };
}

module.exports = {
	init : init,
    add : add,
    remove : remove
};

init.init = init;
init.add = add;
init.remove = remove;
module.exports = init;
