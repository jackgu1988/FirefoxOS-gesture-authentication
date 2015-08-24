const DB_NAME = 'GestureDatabase';
const DB_VERSION = 1;

const TABLE_REF_GESTURE = "Reference_Gesture_table";
const COL_ID = "ID";
const COL_SIZE = "Size";
const COL_START_GESTURE = "Start_Gesture";

const TABLE_GESTURE = "Gesture_table";
const COL_GESTURE_ID = "ID";
const COL_X = "X";
const COL_Y = "Y";
const COL_Z = "Z";

var db;

function initializeDB() {
	if (window.indexedDB) {
		console.log("IndexedDB support is there");
	} else {
		alert("Indexed DB is not supported. Where are you trying to run this ? ");
	}

	// open the database
	// 1st parameter : Database name. We are using the name 'notesdb'
	// 2nd parameter is the version of the database.
	var request = indexedDB.open('gesturesdb', 1);
	
	request.onsuccess = function (e) {
		// e.target.result has the connection to the database
		db = e.target.result;
		load();
		//Alternately, if you want - you can retrieve all the items
	}

	request.onerror = function (e) {
		console.log(e);
	};

	// this will fire when the version of the database changes
	// We can only create Object stores in a versionchange transaction.
	request.onupgradeneeded = function (e) {
		// e.target.result holds the connection to database
		db = e.target.result;

		if (db.objectStoreNames.contains("Reference_Gesture_table")) {
			db.deleteObjectStore("Reference_Gesture_table");
		}

		if (db.objectStoreNames.contains("Gesture_table")) {
			db.deleteObjectStore("Gesture_table");
		}

		// create a store named 'notes'
		// 1st parameter is the store name
		// 2nd parameter is the key field that we can specify here. Here we have opted for autoIncrement but it could be your
		// own provided value also.
		var objectStore2 = db.createObjectStore('Reference_Gesture_table', { keyPath: 'id', autoIncrement: true });
		var objectStore = db.createObjectStore('Gesture_table', { keyPath: 'id', autoIncrement: true });

		console.log("Object Store has been created");
	};
}

var newGesture = [];
var loadedGesture = [];
var gestureChar = [];
var allGestures = [];

$(document).ready(function() {

	initializeDB();
	
	var timeout;
	var count = 0;
	
	var touched = false;

	document.getElementById("record").addEventListener('touchstart', function() {
		newGesture = [];

		touched = true;

		timeout = setInterval(function(){
			var dots = "";
			count++;
			for (var i = 1; i < count; i++)
				dots += ".";
			$('#text').text("Recording" + dots);
			if (count > 3)
				count = 0;
		}, 500);

		return false;
	});

	document.addEventListener('touchend', function(){
		clearInterval(timeout);

		if (touched)
			$("#text").text("Recorded " + newGesture.length + " frames.");

		touched = false;

		return false;
	});

	function handleOrientation(event) {
		var absolute = event.absolute;
		var alpha    = event.alpha;
		var beta     = event.beta;
		var gamma    = event.gamma;

		if (touched) {
			newGesture.push([beta, gamma, alpha]);
		}
	}

	window.addEventListener('deviceorientation', handleOrientation);

});

function minimum(X, Y, Z) {

	if (X < Y) {
		if (X < Z) {
			return 1;
		} else {
			return -1;
		}
	} else {
		if (Y < Z) {
			return 0;
		} else {
			return -1;
		}
	}
}

function dtw(referenceGesture) {
	var dtw = initialisation(referenceGesture);
	var min;

	for (var i = 1; i < referenceGesture.length + 1; i++) {
		for (var j = 1; j < newGesture.length + 1; j++) {
			min = minimum(dtw[i - 1][j], dtw[i - 1][j - 1], dtw[i][j - 1]);

			switch (min) {
				case -1:
				dtw[i][j] = costT(referenceGesture[i - 1], newGesture[j - 1]) + dtw[i][j - 1];
				break;
				case 0:
				dtw[i][j] = costT(referenceGesture[i - 1], newGesture[j - 1]) + dtw[i - 1][j - 1];
				break;
				case 1:
				dtw[i][j] = costT(referenceGesture[i - 1], newGesture[j - 1]) + dtw[i - 1][j];
				break;
			}
		}
	}

	return Math.sqrt(dtw[referenceGesture.length][newGesture.length]);
}

function initialisation(referenceGesture) {
 	var dtw2 = new Array(referenceGesture.length + 1);

	for (var i = 0; i < referenceGesture.length + 1; i++) {
		dtw2[i] = new Array(newGesture.length + 1);
	}

	for (var i = 1; i < referenceGesture.length + 1; i++) {
		dtw2[i][0] = Number.MAX_SAFE_INTEGER;
	}

	for (var i = 1; i < newGesture.length + 1; i++) {
		dtw2[0][i] = Number.MAX_SAFE_INTEGER;
	}

	dtw2[0][0] = 0;
	
	return dtw2;
}

function compare() {
	if (newGesture.length > 0 && gestureChar.length > 0) {
		var cost;
		var minCost = Number.MAX_SAFE_INTEGER;
		var id = -1;

 		for (var i = 0; i < gestureChar.length; i++) {
			cost = dtw(allGestures[i]);
			if (minCost > cost) {
				minCost = cost;
 				id = i;
			}
 		}

		if (minCost > 50) {
			$(".ui-page").css("background", "red");
		} else {
			$(".ui-page").css("background", "green");
		}
		$("#text").text("The score of " + minCost + " id = " + id);
	} else {
		$("#text").text("A gesture is missing!!!");
	}
}

function save() {
	if (newGesture.length > 0) {
		var transaction = db.transaction([ 'Gesture_table' ], 'readwrite');
		var transaction2 = db.transaction([ 'Reference_Gesture_table' ], 'readwrite');
			
		var value2 = {};
		value2.size = newGesture.length;

		var store2 = transaction2.objectStore('Reference_Gesture_table');
		var request2 = store2.add(value2);

		for (var i = 0; i < newGesture.length; i++) {
			var value = {};
			value.x = newGesture[i][0];
			value.y = newGesture[i][1];
			value.z = newGesture[i][2];

			var store = transaction.objectStore('Gesture_table');
			var request = store.add(value);

			request.onsuccess = function (e) {
					console.log("Your gesture has been saved");
			};

			request.onerror = function (e) {
				console.log("Error in saving the gesture. Reason : " + e.value);
			}
		}

		$('#text').text("Saved a gesture of " + newGesture.length + " frames.");
		
		load();
	} else {
		$('#text').text("Please record a gesture first.");
	}
}

function load() {
	allGestures = [];
	gestureChar = [];
	loadedGesture = [];

	//Read the gesture

	var transaction2 = db.transaction([ 'Reference_Gesture_table' ]);
	var store2 = transaction2.objectStore('Reference_Gesture_table');
	
	store2.openCursor().onsuccess = function (e) {
		var cursor = e.target.result;
		if (cursor) {
			var value = cursor.value;

			gestureChar.push(value.size);

			// move to the next item in the cursor
			cursor.continue();
		}
	}
	
	transaction2.oncomplete = function (event) {

		var transaction = db.transaction([ 'Gesture_table' ]);
		var store = transaction.objectStore('Gesture_table');

		if (gestureChar.length > 0) {
			var current_gesture = 0;
			var gesture_length = gestureChar[0];
			var cnt = 0;

			// open a cursor to retrieve all items from the 'Gesture_table' store
			store.openCursor().onsuccess = function (e) {
				var cursor = e.target.result;
				if (cursor) {
					var value = cursor.value;

					loadedGesture.push([value.x, value.y, value.z]);
				
					cnt++;

					if (cnt >= gesture_length) {
						allGestures.push(loadedGesture);
						current_gesture++;
						cnt = 0;
						loadedGesture = [];
						gesture_length = gestureChar[current_gesture];
					}

					// move to the next item in the cursor
					cursor.continue();
				}

				$("#text").text("Found " + allGestures.length + " recorded gestures.");
			}
		}
	};
}

function costT(refG, newG) {
	var cost;

	cost = (refG[0] - newG[0]) * (refG[0] - newG[0]) + (refG[1] - newG[1])
	* (refG[1] - newG[1]) + (refG[2] - newG[2])
	* (refG[2] - newG[2]);

	return cost;
}