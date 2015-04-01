var haproxyMod = new require('haproxy'),
 compiler = require('./compiler'),
 HAProxy = haproxyMod({
    config : __dirname + '/tempfiles/haproxy.cfg',
    pidFile : __dirname + '/tempfiles/haproxy.pid'
});


module.exports = {
    init : function () {
        var all = true; // Kill all running Haproxy
        HAProxy.stop(all, function(err){
            compiler(); //Compile and create the HAP config
            HAProxy.start(function (err) {
                if(err) {console.log(err); return;}
                else console.log('  .. HAP started ..');
            });
        });
    },
    restart : function (cb) {
        HAProxy.reload(function (err) {
            if(err) {console.log(err); return cb(err);}
            else console.log('  .. HAP reloaded ..');
            cb();
        });
    }
};


