/* @constructor class that implements page controller
 * it loads list of presentations and "glues" togather 
 * page componentes. 
 * Implements event bus
 * */
var Controller = function () {
  var  presentationDiv = jQuery('div.presentation'),
    presentationListDiv = jQuery('div.presentation-list');
  this._eventBusObj = jQuery('body');
  this._presentation = new Presentation(this, presentationDiv);
  this._presentationList = new PresentationList(this, presentationListDiv);
  this.on('selectPresentation', this._displayPresentation.bind(this));
  this._getPresentations();
};
Controller.prototype = {
  /* subscribe to event
   * @public
   * @argument {String} eventName. name of event to subscribe
   * @argument {Function} callback. function to call, when event is triggered
   * */
  on: function (eventName, callback) {
    this._eventBusObj.on(eventName + '.controller', function () {
      //remove event, leave only data
      Array.prototype.shift.call(arguments);
      callback.apply(null, arguments);
    });
  },
  /* trigger event
   * @public
   * @argument {String}  -- first argument is event name to trigger
   * all other arguments are optional, and will be passed as is to 
   * event handler
   * */
  emit: function () {
    var eventName = Array.prototype.shift.call(arguments);
    this._eventBusObj.trigger(eventName + '.controller', arguments);
  },
  /* notify page componetns to display 
   * presentation idefined by  argument
   * */
  _displayPresentation: function (presId) {
    this.emit('select', presId);
  },
  /* get presentations iformation from server
   * @private
   * */
  _getPresentations: function () {
    jQuery.getJSON('/list?' + Date.now(), function (data) {
      if (data && data.status && data.status === 'success') {
        this.emit('presLoad', data.presentations);
        this.emit('select', Object.keys(data.presentations).shift());
      }
    }.bind(this));
  },
};

jQuery(document).ready(function () {
  new Controller();
});
