const mongoose = require('mongoose')
const Schema = mongoose.Schema

const reportSchema = new Schema({
	reporter: {
		email: String
	},
	reported: {
		email: String
	},
	title: String,
	body: String,
	reporttime: {type: Date, default: Date.now},
})

module.exports = mongoose.model('report', reportSchema)
