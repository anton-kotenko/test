/* scroll bar implemetation
 * @constructor
 * @arguments <Object> scrollDiv, jQuery object, that represents 
 * div, that is visible as scrollbar
 * */
var ScrollBar = function (scrollDiv) {
  this._container =  scrollDiv;
  this._indicator = scrollDiv.find('div');
  this._selected = false;
  this._getInidcatorDimensions();
  this._getLimits();
  this._indicator.mousedown(this._onDown.bind(this));
  this._container.mouseleave(this._onUp.bind(this));
  this._indicator.mouseup(this._onUp.bind(this));
  this._container.mousemove(this._onMove.bind(this));
};
ScrollBar.prototype = {
  /* find out left and right border, scroll pointer can be moved 
   * @private
   * */
  _getLimits: function () {
    var coordinates = this._container.offset(),
      width = this._container.innerWidth();
    this._minX = coordinates.left;
    this._maxX = this._minX + width - this._indicatorWidth;
  },
  /* find width of scroll pointer.
   * used in calculations
   * @private
   * */
  _getInidcatorDimensions: function () {
    this._indicatorWidth = this._indicator.innerWidth();
  },
  /* on mouse down handler.
   * set flag, that scroll pointer is moving
   * @private
   * */
  _onDown: function () {
    this._selected = true;
  },
  /* calcualte relative position of cursror, and 
   * notify outer world (by means of notifyMove method)
   * about new scroll bar position
   * @private
   * */
  _notifyMove: function () {
    var relIndicatorPosition;
    relIndicatorPosition = this._indicator.offset().left;
    relIndicatorPosition -= this._minX;
    relIndicatorPosition = relIndicatorPosition/(this._maxX - this._minX);
    this.notifyMove(relIndicatorPosition);
  },
  /* on mouse up -- means end of cursor move.
   * unset apropriate flag, and notify outer
   * world about new cursor position
   * @private
   * */
  _onUp: function () {
    this._selected = false;
    this._notifyMove();
  },
  /* mouse move, adjust position of scroll 
   * and notify outer world about it
   * @private
   * */
  _onMove: function (event) {
    var newX;
    if (!this._selected) {
      return;
    }
    newX = event.pageX;
    if (newX <= this._minX || newX >= this._maxX) {
      //try to go outbound. ignore
      return;
    }
    this._indicator.offset({left: newX});
    this._notifyMove();
  },
  /* set scroll pointer position
   * @public
   * @argument {Number} currentItem.
   * @argument {Number} itemCount.
   * set the cursor at the place,
   * that visually represent item with number currentItem
   * out from itemcCount items. 
   * currentItem is taken from 0 (array index)
   * */
  setCursorPostion: function (currentItem, itemsCount) {
    var newX,
      relPosition;
    if (itemsCount <= 1) {
      relPosition = 0;
    } else {
      relPosition = currentItem / (itemsCount -1);
    }
    newX = this._minX + relPosition * (this._maxX - this._minX);
    this._indicator.offset({left: newX});
  },
  /* @public
   * this method provides the way to notify outer world about changes
   * anyone, who's interested in this information, has to replace 
   * this method, with it's own callback
   * */
  notifyMove: function () {
  }
};
/* @constructor class that implements displaying 
 * of one presentation, with scroll bar and navigation buttons
 * @arguments {Object} controller instance of page controller,
 * that works as Event bus 
 * @argument {Object} containerDiv. jQuery object, that represents
 * div tag, that contains all elements of interface, related to 
 * one presentation
 * */
var Presentation = function (controller, containerDiv) {
  this._containerDiv = containerDiv;
  this._frameImg = containerDiv.find('div.current-frame img');
  this._prevButton = containerDiv.find('div.controls button:first');
  this._nextButton = containerDiv.find('div.controls button:last');
  this._controller = controller;
  this._presentations = {};
  this._activePres = false;
  this._scrollBar = new ScrollBar(this._containerDiv.find('div.navigation'));
  this._scrollBar.notifyMove = this._onScrollMove.bind(this);
  //subscribe to event, that provides list of presentations
  this._controller.on('presLoad', function (presentations) {
    this._presentations = presentations;
  }.bind(this));
  //subscribe to event, that notifies to change current presentation
  //to another
  this._controller.on('select', this._displayPresById.bind(this));
  this._prevButton.click(this._prev.bind(this));
  this._nextButton.click(this._next.bind(this));
};
Presentation.prototype = {
  /* make deep copy of presetations object
   * @private
   * @arguments {Object} original object that represents presentation information
   * @return {Object} -- copy of original object
   * */
  _clonePresentation: function (original) {
    return {
      id: original.id,
      currentFrame: original.currentFrame,
      frames: original.frames.slice(0)
    };
  },
  /* find out presentation by id
   * @private
   * @argument {Number} presId -- indentifier of presentation to choose
   * */
  _selectActivePresById: function (presId) {
    this._activePres = this._presentations[presId];
    if (!this._activePres || !this._activePres.frames.length) {
      this._activePres = false;
      return;
    }
    this._activePres = this._clonePresentation(this._activePres);
  },
  /* display current presentation's frame
   * @private
   * */
  _displayCurrentFrame: function () {
    if (!this._activePres) {
      return;
    }
    this._scrollBar.setCursorPostion(this._activePres.currentFrame, this._activePres.frames.length);
    this._frameImg.attr(
      'src',
      '/images/' + this._activePres.id + '/' + this._activePres.frames[this._activePres.currentFrame]
    );
  },
  /* display presentation defined by id
   * @private
   * @argument {Number} presId
   * */
  _displayPresById: function (presId) {
    this._selectActivePresById(presId);
    this._handleControls();
    this._displayCurrentFrame();
  },
  /* handle scroll bar changes. 
   * if requred switch active frame
   * and display changes
   * @private
   * @argument {Number} repPosition. relative position of scroll bar cursor
   * (from 0 to 1). 
   * */
  _onScrollMove: function (relPosition) {
    var newFrame;
    if (!this._activePres) {
      return;
    }
    if (this._activePres.frames.length <= 1) {
      //scroll is sensless for presenations with one frame
      return;
    }
    newFrame = Math.round(relPosition * (this._activePres.frames.length -1));
    if (newFrame !== this._activePres.currentFrame) {
      this._activePres.currentFrame = newFrame;
      this._handleControls();
      this._displayCurrentFrame();
    }

  },
  /* display presentation's frame, which number
   * differs from current to increment
   * @private
   * @argument {Number} increment (positive integer if to move right, or negative otherwise)
   * */
  _move: function (increment) {
    var newFrame;
    if (!this._activePres) {
      return;
    }
    newFrame = this._activePres.currentFrame + increment;
    if (newFrame < 0 || newFrame >= this._activePres.frames.length) {
      return;
    }
    this._activePres.currentFrame = newFrame;
    this._handleControls();
    this._displayCurrentFrame();
  },
  /* previous button click handler
   * move to previous frame
   * @private
   * */
  _prev: function () {
    this._move(-1);
  },
  /* next button click handler
   * move to next frame
   * @private
   * */
  _next: function () {
    this._move(+1);
  },
  /* enable/disable control buttons, according 
   * to currently displayed frame
   * @private
   * */
  _handleControls: function () {
    if (!this._activePres) {
      return;
    }
    if (this._activePres.currentFrame <= 0) {
      this._prevButton.attr("disabled", true);
    } else {
      this._prevButton.removeAttr("disabled");
    }
    if (this._activePres.currentFrame >= this._activePres.frames.length - 1) {
      this._nextButton.attr("disabled", true);
    } else {
      this._nextButton.removeAttr("disabled");
    }
  }
};
/* @constructor class that implements 
 * presentation chooser;
 * @argument {Object} controller -- page controller,
 * work also as event bus
 * @argument {Object} jQuery object, that represents div
 * that contains all tags, that implement this class view
 * */
var PresentationList = function (controller, containerDiv) {
  this._containerDiv = containerDiv;
  this._controller = controller;
  this._controller.on('presLoad', function (presentations) {
    this._presentations = presentations;
    this._initList();
  }.bind(this));
};
PresentationList.prototype = {
  /* build choose list,
   * subscribe to click events
   * @private
   * */
  _initList: function () {
    var pattern = jQuery('div.patterns div.list-item-pattern div'),
      img = pattern.find('img');
    jQuery.each(this._presentations, function (key, value) {
      var copy;
      img.attr('src', '/images/' + value.id + '/' + value.frames[value.currentFrame]);
      copy = pattern.clone();
      copy.data('id', value.id);
      copy.appendTo(this._containerDiv);
    }.bind(this));
    this._presDivs = this._containerDiv.find('div');
    this._presDivs.click(this._click.bind(this));
  },
  /* presentation click handler. 
   * notify controller, about chosen presentation
   * @private
   * */
  _click: function (event) {
    var presId = jQuery(event.currentTarget).data('id');
    this._controller.emit('selectPresentation', presId);
    this._presDivs.removeClass('selected');
    jQuery(event.currentTarget).addClass('selected');
  }
};

