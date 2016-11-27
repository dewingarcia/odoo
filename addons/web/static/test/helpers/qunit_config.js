// not important in normal mode, but in debug=assets,
// the files are loaded asynchroneously, which can lead
// to various issues with QUnit...
// Notice that this is done outside of odoo modules, otherwise
// the setting would not take effect on time.
QUnit.config.autostart = false;

QUnit.config.testTimeout = 1 * 60 * 1000;

QUnit.done(function(result) {
    if (result.failed === 0) {
        console.log('ok');
    } else {
        console.log('error');
    }
});

QUnit.log(function(result) {
    if (!result.result) {
        console.log('"' + result.name + '"', 'in section', '"' + result.module + '"', 'failed:', result.message);
    }
});

QUnit.moduleDone(function(result) {
    if (!result.failed) {
        console.log('"' + result.name + '"', "passed", result.total, "tests.");
    } else {
        console.log('"' + result.name + '"', "failed:", result.failed, "tests out of", result.total, ".");
    }

});