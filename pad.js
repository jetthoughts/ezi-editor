var racer = require('racer');

function EziPad(options) {
  this.options = options;
  var roomId = options.roomId;
  var data = JSON.parse(this.getRoomData(roomId));
  var rootModel = racer.createModel(data);
  this.rootModel = rootModel;

  var model = rootModel.at('_page.room');
  this.model = model;
  var content = rootModel.at('rooms.' + roomId).get('content');

  if(options.onInitialContent) {
    options.onInitialContent(content);
  }

  model.on('change', this.onModelChange.bind(this));
}

EziPad.prototype.getRoomData = function(room) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open( "GET", (this.options.backendUrl || '') + '/rooms/' + room, false);
  xmlHttp.send( null );
  return xmlHttp.responseText;
}

EziPad.prototype.applyChange = function(previous, value) {
  if (previous === value) return;
  var start = 0;
  while (previous.charAt(start) == value.charAt(start)) {
    start++;
  }
  var end = 0;
  while (
  previous.charAt(previous.length - 1 - end) === value.charAt(value.length - 1 - end) &&
  end + start < previous.length &&
  end + start < value.length
    ) {
    end++;
  }

  if (previous.length !== start + end) {
    var howMany = previous.length - start - end;
    this.model.stringRemove(start, howMany);
  }
  if (value.length !== start + end) {
    var inserted = value.slice(start, value.length - end);
    this.model.stringInsert(start, inserted);
  }
}

EziPad.prototype.onModelChange = function(value, previous, passed) {
  if (!passed.$remote) return;

  var transformCursor, newText;
  if (passed.$stringInsert) {
    passed = passed.$stringInsert;
    var index = passed.index;
    var text = passed.text;
    transformCursor = function(cursor) {
      return (index < cursor) ? cursor + text.length : cursor;
    };
    newText = previous.slice(0, index) + text + previous.slice(index);
  } else if (passed.$stringRemove) {
    passed = passed.$stringRemove;
    var index = passed.index;
    var howMany = passed.howMany;
    transformCursor = function(cursor) {
      return (index < cursor) ? Math.max(index, cursor - howMany) : cursor;
    };
    newText = previous.slice(0, index) + previous.slice(index + howMany);
  } else {
    newText = value || '';
    transformCursor = function(cursor) { return cursor; }
  }
  this.replaceText(newText, transformCursor);
}

EziPad.prototype.replaceText = function(newText, transformCursor) {
  if (this.options.onTextUpdated) {
    this.options.onTextUpdated(newText, transformCursor);
  }
}

EziPad.prototype.updateInput = function(value) {
    // IE and Opera replace \n with \r\n
    var value = value.replace(/\r\n/g, '\n');
    var previous = this.model.get() || '';

    if (value != previous) {
      this.applyChange(previous, value);
    }
}

window.EziPad = EziPad;
