const Emitter = function() {
	const subscribers = {};
	return {
		on : function(eventname, callback) {
			subscribers[eventname] = subscribers[eventname] || [];
			subscribers[eventname].push(callback);
			return this;
		},
		emit : function(eventname) {
			let args = Array.prototype.slice.call(arguments,1);
			for (let i in subscribers[eventname]) {
				subscribers[eventname][i].apply(this, args);
			}
			return this;
		}
	};
};