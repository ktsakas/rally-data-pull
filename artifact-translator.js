var KeyMapper = require('./key-mapper.js');

module.exports = new KeyMapper({
	_ref: "Ref",
	CreationDate: true,
	ObjectID: true,
	FormattedID: true,
	Name: true,
	ScheduleState: true,
	AcceptedDate: true,
	InProgressDate: true,
	c_KanbanState: "KanbanState",
	c_L3KanbanStage: "L3KanbanStage"
});