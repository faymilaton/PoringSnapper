const db = require('better-sqlite3')('ohsnap.db');
const schemas = require('./schemas.js');
const dbfuncs = require('./dbfuncs.js');
const fuzzy = require('./fuzzy.js');

// This file is for updating database schemas between project version

let projectversion;
let databaseversion;

let versionHistory = ["1.0.0", "1.0.1"];

let patchdb = {};

// Returns true if there has been a version change for the project
patchdb.checkVersionChange = function() {
// retrieve version from package.json
// retrieve version from database
// if no version exists in database, then insert version and return false
}

patchdb.doPatches = function() {
	patch0();
}

/**
 * Patch from version 1.0.0 to 1.0.1
 * Changes:
 * - added budgetID foreign key to requirements table
 */
function patch0() {
	let newrequirements = `
		requirements (
			reqID INTEGER PRIMARY KEY AUTOINCREMENT,

			message TEXT,

			name TEXT,
			slotted INTEGER,
			refine BLOB NOT NULL DEFAULT 65535,
			broken INTEGER,
			pricehigher INTEGER,
			pricelower INTEGER,
			buyers INTEGER,
			enchant TEXT,
			enchantlevel BLOB NOT NULL DEFAULT 31,
			category TEXT,
			stock INTEGER,
			alias INTEGER NOT NULL DEFAULT 0,

		  	metareqID INTEGER,
		  	FOREIGN KEY (metareqID) REFERENCES metareqs(mreqID) ON DELETE CASCADE
		)`;

	console.log("starting");
	let allreqs = dbfuncs.listAllRequirements(); // should have discordkidID and channelID

	let rename = db.prepare('ALTER TABLE requirements RENAME TO temp');
	console.log(rename.run());
	let create = db.prepare(`CREATE TABLE ${newrequirements}`);
	console.log(create.run());
	let insert = db.prepare(`INSERT INTO requirements (message, name, slotted, refine, broken, pricehigher, pricelower,
													   buyers, enchant, enchantlevel, category, stock, alias, metareqID)
							 VALUES (@message, @name, @slotted, @refine, @broken, @pricehigher, @pricelower,
							 		 @buyers, @enchant, @enchantlevel, @category, @stock, @alias, @metareqID)`)
	for(let r of allreqs) {
		r.metareqID = dbfuncs.getOrCreateMetareqID(r.discordkidID, r.channelID);
		console.log(insert.run(r));
	}
	let drop = db.prepare('DROP TABLE IF EXISTS requirements').
	console.log(drop.run());
	console.log("done");
}

// this function is for cleaning up the database of loose id references and mistyped names
patchdb.cleanup = function() {
	// remove all users with 0 requirements made
	// remove all users not found in guilds
	// remove all roles not found in guilds
	// check if bot has access to all guilds in guilds
}

patchdb.fixnames = function(bot) {
	let allreqs = dbfuncs.listAllRequirements();

	for(let req of allreqs) {
		if(req.name === null) continue;

		let ac = fuzzy.name(req.name)
		if(ac === undefined) {
			let lastChar = req.name[req.name.length - 1];
			// check if last character is a digit
			if(lastChar >= '0' && lastChar <= '9')
				ac = fuzzy.name(req.name.slice(0, -1))

			if (ac === undefined) {
				let contact = dbfuncs.getRequirement(req.reqID);
				let isDeleted = dbfuncs.deleteRequirement(req.reqID);

				// DO DELETE REQUEST. IF SUCCESS THEN DO MESSAGE. IF FAIL, LOG.
				if(isDeleted) {
					let message = `<@${contact.discordid}> your request shown below has been deleted since ${contact.name} could not be validated to an actual item name`;
					message += '\n```' + `id: ${contact.reqID} | ${contact.message}` + '```';
					console.log(`successfullly deleted id: ${contact.reqID} | ${contact.message}`);
					bot.channels.fetch(contact.discordchid).then((chan) => {
                    	chan.send(message);
               		});
				} else {
					console.log(`there was an error trying to delete id: ${contact.reqID} | ${contact.message}`);
				}
				continue;			
			}
		}
		ac = ac.replace(/\s/g, ''); // remove spaces finally
		if(req.name !== ac) {
			let contact = dbfuncs.getRequirement(req.reqID);
			let query = db.prepare(`UPDATE requirements SET message=?, name=? WHERE reqID=?`);
			req.message = req.message.replace(req.name, ac)
			let success = query.run(req.message, ac, req.reqID).changes !== 0;

			if(success) {
				let message = `<@${contact.discordid}> your request shown below has been fixed for you by changing ${contact.name} to ${ac}`;
				message += '\n```' + `id: ${contact.reqID} | ${req.message}` + '```';
				console.log(`successfullly changed id: ${contact.reqID} | ${req.message}`);
				bot.channels.fetch(contact.discordchid).then((chan) => {
                    chan.send(message);
                });
			} else {
				console.log(`there was an error trying to change id: ${contact.reqID} | ${contact.message}`);
			}
		}
	}
}

/*


var zzz = db.prepare(`ALTER TABLE requirements
  					  RENAME TO reqold;`);
console.log(zzz.run());

var lol = `
requirements (
	reqID INTEGER PRIMARY KEY AUTOINCREMENT,

	message TEXT,

	name TEXT,
	slotted INTEGER,
	refine BLOB NOT NULL DEFAULT 65535,
	broken INTEGER,
	pricehigher INTEGER,
	pricelower INTEGER,
	buyers INTEGER,
	enchant TEXT,
	enchantlevel BLOB NOT NULL DEFAULT 31,
	category TEXT,
	stock INTEGER,
	alias INTEGER NOT NULL DEFAULT 0,

	discordkidID INTEGER NOT NULL,
	channelID INTEGER NOT NULL,

	FOREIGN KEY (discordkidID) REFERENCES discokids(dkidID) ON DELETE CASCADE,
	FOREIGN KEY (channelID) REFERENCES channels(chID) ON DELETE CASCADE
)`;

var sqlxd = 'CREATE TABLE IF NOT EXISTS ' + lol;
db.exec(sqlxd);


var yyy = db.prepare(`INSERT INTO requirements (reqID, message, name, slotted, refine, broken, pricehigher, pricelower, buyers, enchant, enchantlevel, category, stock, alias, discordkidID, channelID)
					  SELECT reqID, message, name, slotted, refine, broken, pricehigher, pricelower, buyers, enchant, enchantlevel, category, stock, alias, discordkidID, channelID
   					  FROM reqold;`);
console.log(yyy.run());


// var zzz = db.prepare(`UPDATE requirements
//   					  SET alias = 0
//   					  WHERE alias IS NULL;`);
// console.log(zzz.run());



// //var zzz = db.prepare(`PRAGMA table_info(requirements);`);
// var zzz = db.prepare(`select * from requirements`);

// console.log(zzz.all());
*/
module.exports = patchdb;