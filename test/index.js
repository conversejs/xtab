/*global describe, it, expect, beforeEach, XTab */

function runInIframe (iframe, fn) {
    const args = [].slice.call(arguments, 2);
    return iframe.contentWindow.window.eval(`(${fn}).apply(window, ${JSON.stringify(args)});`);
}

function runWhenReady (onload) {
    let done;
    return () => {
        if (!done && (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete')) {
            done = true;
            this.onload = this.onreadystatechange = null;
            onload();
        }
    };
}

function xtabOnload () {
    for (let i = 0; i < iframe.onloadqueue.length; i++) {
        iframe.run(iframe.onloadqueue[i]);
    }
    iframe.onloadqueue = { push: iframe.run };
}

function evalFunc (fn, args) {
    Function(`return ${fn};`)().apply(null, args); // eslint-disable-line no-new-func
}

function setupIframe (onload) {
    const iframe = document.createElement('iframe');
    iframe.id = XTab.generateId();
    iframe.src = "/base/test/iframe.html";

    iframe.onloadqueue = [];
    iframe.run = (fn, ...args) => runInIframe(iframe, evalFunc, fn.toString(), args);
    iframe.onloadqueue.push(onload);

    iframe.onload = iframe.onreadystatechange = runWhenReady(function () {
      iframe.run(() => {
            window.addFeedback = (txt) => {
                const div = document.querySelector('#feedback');
                div.appendChild(document.createTextNode(txt))
                div.appendChild(document.createElement('br'));
            }
            window.addFeedback('iframe loaded');
        });
        xtabOnload();
    });

    document.body.appendChild(iframe);
    return iframe;
}

function removeIframe (iframe) {
    if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
    }
}


let iframe;

describe("xtab", function () {

  describe("A tab", function () {

        beforeEach(function (done) {
            removeIframe(iframe);
            window.done = done;
            iframe = setupIframe(function () {
                window.xtab = new XTab();
                window.xtab.start();
                window.addFeedback('xtab started');
                window.parent.done();
            });
        });

        it('receives broadcasts from other tabs', function (done) {
            const xtab = new XTab();
            xtab.start();
            const msg = "";
            xtab.once('message', data => {
                expect(data.msg).toBe(msg);
                done();
            });
            iframe.run(msg => window.xtab.broadcast('message', { msg }), msg);
        });
    });
});
