# XTab

[![Travis](https://api.travis-ci.org/conversejs/xtab.png?branch=master)](https://travis-ci.org/conversejs/xtab)

XTab is a small utility library that provides an easy API for communicating between
tabs and for automatically electing a primary (or "master") tab.

Having a primary tab is useful when you want to maintain a single (or at least
one) websocket or push connection for your web app.

For security purposes, the browser restricts cross-tab communication to tabs under the same domain.

## API

### Initializing

In each tab, you need to instantiate the XTab class and then call `start`:

```
const xtab = new XTab();
xtab.start();
```

### Broadcasting

To send an event to all tabs, use the `broadcast` method:

```
xtab.broadcast('myEvent',  {foo: 'bar'});
```

### Listening

To listen for events from other tabs, you can call `once` for a one-time
listener, and `on` to listen indefinitely.

```
xtab.once('myEvent',  data => alert(data.foo));
xtab.on('myEvent',  data => console.log(data.foo));
```

### Events

Once a tab is designated to be the master tab, the `isMaster` event will be triggered.

```
xtab.on('isMaster',  data => {
    if (data.value) {
        alert(`The tab with id ${data.tabxid} is now the master tab`);
    } else {
        alert(`The tab with id ${data.tabxid} is no longer the master tab`);
    }
});
```

### Properties

The `xtab` instance will have certain properties that you can read.

```
if (xtab.isMaster) {
    // this is the master tab
}

if (xtab.isFocused) {
    // this tab is focused
}

```


## Credits

XTab is inspired by the [WindowController](https://github.com/fastmail/overture/blob/master/source/application/WindowController.js) class, by Fastmail Pty Ltd.
