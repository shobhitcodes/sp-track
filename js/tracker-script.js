//Global variables --start

let defaultMapOptions = {
	center: {lat: 18.5204303, lng:73.85674369999992}, //Location - Pune
	zoom: 14,
	clickableIcons: false,
	disableDefaultUI: true,
	keyboardShortcuts: false,
	zoomControl: true,
	disableDoubleClickZoom: true,
	draggable: true
};
let layerIdBegin = 101;
let layersName = ["Personell", "Signsplan", "Bannerplan"];
let newMarkerFlag = false;
let mapEditFlag = false;
let googleMap;
let dataSet = ["map", "layer", "checkpoint"];
let markers = [];
let markerListener;
let tabsEle = "#tracker-tabs";
let trackEle = "#tracker-op-2";
let layerEle = {"Personell" : "#tracker-op-3", "Signsplan" : "#tracker-op-4", "Bannerplan" : "#tracker-op-5"};

//Global variables --end


//Helper Methods --start

//Returns unique id
const getUID = () => Math.random().toFixed(10).toString(36).substr(2, 16);

//Checks if local storage exists in broswer
const checkLocalStorage = () => {
	var check = 'localTest';
	try {
		localStorage.setItem(check, check);
		localStorage.removeItem(check);
		return true;
	} catch(e) {
		return false;
	}
};

//Updates global sets
// function updateSet(key, id, itemKey, value) {
// 	let changeSet;
// 	if(key === "map") {
// 		changeSet = mapSet;
// 	}
// 	changeItemIndex = changeSet.findIndex(x => x.id == id);
// 	if(itemKey === "active") {
// 		changeSet.map(x => x.active = 0);
// 	}
// 	changeSet[changeItemIndex][itemKey] = value;
// 	mapSet = changeSet;
// }

//Updates select options for passed element with new passed options
const setSelectOption = (ele, newOptions, selectedOption) => {
	let options = ele.prop ? ele.prop('options') : ele.attr('options');
	$('option', ele).remove();
	$.each(newOptions, (val, text) => options[options.length] = new Option(text, val));
	ele.val(selectedOption);
};

//Sets and initializes passed element with passed string
const setTooltip = (ele, tooltipText) => {
	ele.attr("data-tooltip", tooltipText);
	initTooltip(ele);
};

//Updates tab system according to existing map and its layers 
const setTabs = () => {
	let activeMap = getActiveMap();
	if(activeMap !== undefined) {
		$('a[href="' + trackEle + '"]').parent().removeClass("d-none");
		$(trackEle).removeClass("d-none");
		activeMap.layer.forEach(item => {
			let layerName = getLayerName(item.id);
			if(item.active) {
				$('a[href="' + layerEle[layerName] + '"]').parent().removeClass("d-none");
				$(layerEle[layerName]).removeClass("d-none");
			} else {
				$('a[href="' + layerEle[layerName] + '"]').parent().addClass("d-none");
				$(layerEle[layerName]).addClass("d-none");
			}
		});
		initTabs($(tabsEle), true);
	} else {
		$('a[href="' + trackEle + '"]').parent().addClass("d-none");
		$(trackEle).addClass("d-none");
		initTabs($(tabsEle));
	}
};

//Helper Methods --end


//Data Service Methods --start

//Fetches data from local storage
const fetchData = () => {
	if(checkLocalStorage()) {
		$.each(dataSet, (key, value) => window[value] = JSON.parse(localStorage.getItem(value)));
	}
};

//Sets data on local storage
const updateLocalStorage = key => localStorage.setItem(key, JSON.stringify(window[key]));

//Sets default layers data on local storage
const pushDefaultLayers = () => {
	if(checkLocalStorage()) {
		let layers = [];
		layersName.forEach((value, index) => 
			layers.push({
				"id" : layerIdBegin + index,
				"name" : value
			})
			);
		localStorage.setItem("layer", JSON.stringify(layers));
	}
};

//Data Service Methods --end


//Materialize Component Methods --start

//To initialize Materialize components
const initMaterialize = () => {
	// map ? $('#tracker-tabs').tabs({swipeable: true, onShow: tab => onTabChange(tab)}) : $('#tracker-tabs').tabs();
	$('#roster-tabs .tabs').tabs();
	initTooltip($('.tooltipped'));
};

//To initialize tabs for passed element
const initTabs = (ele,swipe) => swipe ? ele.tabs({swipeable: true, onShow: tab => onTabChange(tab)}) : ele.tabs();

//To initialize tooltip for passed element
const initTooltip = ele => ele.tooltip();

//To initialize select options for passed element
const initSelect = ele => ele.formSelect();

//Executes on a tab change
const onTabChange = tab => {
	if(tab.id === "tracker-op-2") {
		setCheckpointType();
	} else {
		removeAddCheckpoint();
	}
};

//Materialize Component Methods --end


//Google map Service Methods --start

//Initializes and displays google map 
const initGoogleMap = () => {
	if(googleMap === undefined) {
		googleMap = new google.maps.Map(document.getElementById("map-canvas"), defaultMapOptions);
	}
	let activeMap = getActiveMap();
	if(activeMap !== undefined) {
		googleMap.setOptions({
			center: {lat: activeMap.center.lat, lng: activeMap.center.lng},
			zoom: activeMap.zoom,
			draggable: activeMap.draggable
		});
		$("#map-canvas").removeClass("d-none");
	}
};

//Activates Google map navigation by places
const activatePlaceAutocomplete = () => {
	let autocomplete = new google.maps.places.Autocomplete(document.getElementById('tracker-map-location-search'));
	autocomplete.addListener('place_changed', () => {
		let place = autocomplete.getPlace();
		if (!place.geometry) {
			return;
		}
		place.geometry.viewport ? googleMap.fitBounds(place.geometry.viewport) : googleMap.setCenter(place.geometry.location);
	});
};

//Clears all listeners set on google map
const clearAllListeners = () => google.maps.event.clearListeners(googleMap, 'click');

//Adds marker(checkpoint) on google map at passed location 
const addMarker = location => {
	let markerId = getUID();
	let marker = createHTMLMapMarker({
		latlng: location,
		map: googleMap,
		html: `<div id="${markerId}" class="checkpoint-gtag white droppable"></div>`,
		id: markerId
	});
	markers.push(marker);
};

//Activates marker selection - listens for click on google maps and creates custom marker on the clicked location
const activateMarkerSelection = () => {
	markerListener = googleMap.addListener('click', event => {
		removeUnsavedMarker();
		addMarker(event.latLng);
		newMarkerFlag = true;
		checkpointLocked();
	});
};

//Removes unsaved marker(checkpoint) from google map
const removeUnsavedMarker = () => {
	if(newMarkerFlag === true) {
		markers[markers.length-1].setMap(null);
		markers.pop();
		newMarkerFlag = false;
	}
};

const setMarkers = () => {
	while(markers.length) {
		markers[markers.length-1].setMap(null);
		markers.pop();
	}
	checkpointSet.forEach( item => {
		if(item.map === getActiveMap().id) {
			if(getActiveLayers().includes(item.layer)) {
				let marker = createHTMLMapMarker({
					latlng: new google.maps.LatLng(item.position.lat,item.position.lng),
					map: map,
					html: `<div data-id="${item.id}" class="checkpoint-gtag white droppable"></div>`,
					id: item.id
				});
				markers.push(marker);
			}
		}
	});
};

//Google map Service Methods --end


//Map Service Methods --start

//Maps map data on the DOM
const setMap = () => {
	let mapList = $("#tracker-map-list");
	if(map) {
		mapList.empty();
		$("#tracker-noMaps-label").addClass("d-none");
		map.forEach( item => {
			mapList.append(addMapItem(item.id, item.name, item.active));
		});
		mapList.removeClass("d-none");
		$("li.tracker-map-item").find('.tracker-map-name[data-active="1"]').parent().find("input.tracker-map-status").prop("checked", true);
	} else {
		$("#tracker-noMaps-label").removeClass("d-none");
	}
};

//Fetches maps from local storage and shows on Map wrapper 
// function fetchMaps() {
// 	let mapList = "#tracker-map-list";
// 	$(mapList).empty();
// 	if (checkLocalStorage()) {
// 		if(localStorage.getItem("map")) {
// 			$("#tracker-noMaps-label").addClass("d-none");
// 			let maps = JSON.parse(localStorage.getItem("map"));
// 			mapSet = maps;
// 			mapSet.forEach( item => {
// 				$(mapList).append(addMapItem(item.id, item.name, item.active));
// 			});
// 			//setActiveMap();
// 			$("li.tracker-map-item").find('.tracker-map-name[data-active="1"]').parent().find("input.tracker-map-status").prop("checked", true);
// 		} else {
// 			$("#tracker-noMaps-label").removeClass("d-none");
// 		}
// 	}
// }

//Appends Map element to Map wrapper
const addMapItem = (id, name, active) => 
`<li class="tracker-map-item">
<div class="switch__container">
<i class="material-icons map-edit-icon">edit</i>
<span id="${id}" class="tracker-map-name text__wrap" data-active="${active}">${name}</span>
<span class="switch">
<label>
<input class="tracker-map-status" type="checkbox" ${(active === 1) ? "disabled" : ""}>
<span class="lever"></span>
</label>
</span>
</div>					
</li>
`;

//Returns active map
const getActiveMap = () => map ? map.find(item => item.active === 1 ) : undefined;

//Map Service Methods --end


//Layer Service Methods --start

//Maps layer data on the DOM
const setLayer = () => {
	let activeMap = getActiveMap();
	if(activeMap !== undefined) {
		let layerList = $("#tracker-layer-list");
		layerList.empty();
		activeMap.layer.forEach( layer => {
			layerList.append(addLayerItem(layer.id, getLayerName(layer.id), layer.active));
		});
		$("li.tracker-layer-item").find('.tracker-layer-name[data-active="1"]').parent().find("input.tracker-layer-status").prop("checked", true);
		$("#tracker-layers-wrapper").removeClass("d-none");
	} else {
		$("#tracker-layers-wrapper").addClass("d-none");
	}
};

//Sets initial layer set
const setInitialLayer = () => {
	let layers = [];
	layersName.forEach((value, index) => {
		layers.push({
			"id" : layerIdBegin + index,
			"active" : 1
		});
	});
	window.initialLayer = layers;
};

//Fetches layers from active map and shows on Layer wrapper 
// function fetchLayers() {
// 	let layerList = "#tracker-layer-list";
// 	$(layerList).empty();
// 	if(activeMap !== undefined) {
// 		activeMap.layer.forEach( layer => {
// 			$(layerList).append(addLayerItem(layer.id, getLayerName(layer.id), layer.active));
// 		});
// 		$("li.tracker-layer-item").find('.tracker-layer-name[data-active="1"]').parent().find("input.tracker-layer-status").removeAttr("checked").prop("checked", true);
// 		$("#tracker-layers-wrapper").removeClass("d-none");
// 	} else {
// 		$("#tracker-layers-wrapper").addClass("d-none");
// 	}
// }

//Returns Layer name when layer id is passed to it
const getLayerName = id => layer[layer.findIndex(x => x.id == id)].name;

//Appends layer element to layer wrapper
const addLayerItem = (id, name, active) => 
`<li class="tracker-layer-item">
<div class="switch__container">
<span id="${id}" class="tracker-layer-name text__wrap" data-active="${active}">${name}</span>
<span class="switch">
<label>
<input class="tracker-layer-status" type="checkbox">
<span class="lever"></span>
</label>
</span>
</div>					
</li>
`;

//Makes Layer wrapper visible if any layer exists
const showLayersCheck= () => $("#tracker-layer-list li").length !== 0 ? $("#tracker-layers-wrapper").removeClass("d-none") : $("#tracker-layers-wrapper").addClass("d-none");

//Returns current layer settings of the active map
function getActiveLayerSet() {
	let layerList = JSON.parse(JSON.stringify(initialLayer));
	$(".tracker-layer-name").each((index, item) => {
		layerList[index].active = parseInt($(item).attr("data-active"));
	});
	return layerList;
}

//Returns active layers list
const getActiveLayers = () => {
	let activeLayers = [];
	let activeMap = getActiveMap();
	if(activeMap !== undefined) {
		activeMap.layer.filter(item => item.active === 1).forEach(item => activeLayers.push(item.id));
	}
	return activeLayers;
}

//Layer Service Methods --end


//Checkpoint Methods --start

//Maps checkpoint data on the DOM
const setCheckpoint = () => {
	let activeMap = getActiveMap();
	if(activeMap !== undefined) {
		let cpList = $("#tracker-checkpoint-list");
		cpList.empty();
		if(checkpoint){
			checkpoint.forEach( item => {
				if(item.map === getActiveMap().id && getActiveLayers().includes(item.type)) {
					cpList.append(addCheckpointItem(item.id, item.name, item.position));
				}
			});
		}
	}
	setCheckpointTally();
	showNoCheckpointCheck();
};

//Fetches checkpoints from local storage and shows on checkpoint wrapper 
function fetchCheckpoints() {
	let cpList = "#tracker-checkpoint-list";
	$(cpList).empty();
	if (checkLocalStorage()) {
		if(localStorage.getItem("checkpoint")) {
			$("#tracker-noCheckpoint-label").addClass("d-none");
			let cps = JSON.parse(localStorage.getItem("checkpoint"));
			checkpointSet = cps;
			checkpointSet.forEach( item => {
				if(item.map === getActiveMap().id) {
					$(cpList).append(addCheckpointItem(item.id, item.name, item.position));
				}
			});
			setMarkers();
			setCheckpointTally();
		} else {
			$("#tracker-noCheckpoint-label").removeClass("d-none");
		}
	}
}

//Sets active map layers on checkpoint type selection
const setCheckpointType = () => {
	let newOptions = {};
	let activeMap = getActiveMap();
	if(activeMap !== undefined) {
		activeMap.layer.forEach( layer => {
			if(layer.active === 1) {
				newOptions[layer.id] = getLayerName(layer.id);
			}
		});
		setSelectOption($("#cp-type"), newOptions, Object.keys(newOptions)[0]);
		initSelect($("#cp-type"));
	}
}

//Controls visibility of checkpoint save button
const saveCheckpointCheck = () => $("#cp-title").val() !== "" && $("#cp-type").val() !== null  && newMarkerFlag === true ? $("#cp-add").prop("disabled", false) : $("#cp-add").prop("disabled", true);

//Executes when checkpoint(marker) is added on google map
const checkpointLocked = () => {
	$("#tracker-cp-loc").removeClass("loc-blinker").addClass("prismBlue");
	setTooltip($("#tracker-cp-loc"), "Checkpoint location locked");
	saveCheckpointCheck();
}

//Closes checkpoint add process
const removeAddCheckpoint = () => {
	if(!$("#add-checkpoint-wrapper").hasClass("d-none")) {
		$("#add-checkpoint-wrapper, #close-addCp-btn").addClass("d-none");
		$("#tracker-cp-loc").removeClass("loc-blinker prismBlue");
		// $("#tracker-cp-loc").tooltip("remove");
		M.Tooltip.getInstance($("#tracker-cp-loc")).destroy();
		$("#add-cp-btn").removeClass("d-none");
		$("#cp-add").prop("disabled", true);
		clearAllListeners();
		removeUnsavedMarker();
	}
}

//Makes layer wrapper visible if any layer exists
const showNoCheckpointCheck = () => $("li.tracker-checkpoint-item").length !== 0 ? $("#tracker-noCheckpoint-label").removeClass("d-none") : $("#tracker-noCheckpoint-label").addClass("d-none");

//Sets checkpoint tally
const setCheckpointTally = () => $("#checkpoints-tally").text($("li.tracker-checkpoint-item").length);

//Appends checkpoint element to the checkpoint wrapper
const addCheckpointItem = (id, title, position) =>
`<li class="tracker-checkpoint-item">
<div class="checkpoint-box">
<div class="checkpoint-icon">
<div class="checkpoint-tag"></div>
</div>
<div class="checkpoint-info-wrapper">
<div id="${id}" class="checkpoint-name">${title}</div>
<div class="checkpoint-coordinates">${position.lat.toFixed(3)} - ${position.lng.toFixed(3)}
</div>
</div>
</div>				
</li>
`;

//Checkpoint Methods --end


//Main function(executes when DOM has been loaded) - execution starts here
$(document).ready(() => {
	setInitialLayer();
	pushDefaultLayers();
	fetchData();
	setMap();
	initMaterialize();
	setTabs();
	initGoogleMap();
	activatePlaceAutocomplete();
	setLayer();
	setCheckpoint();
	fetchCheckpoints();

	//Event Handlers on Tab 1(Map) --start

	//Fires when input for map title on add map wrapper is changed 
	$("#map-title").change(() => $("#map-title").val() != "" ? $("#map-add").prop("disabled", false) : $("#map-add").prop("disabled", true));

	//Fires when lock position switch on add map wrapper is changed
	$("#tracker-map-lock-position").change(() => $("#tracker-map-lock-position").prop("checked") ? googleMap.setOptions({draggable: false}) : googleMap.setOptions({draggable: true}));

	//Fires when an inactive map is switched to active
	$("#tracker-map-list").on("change", '.tracker-map-item input.tracker-map-status[type="checkbox"]', ( event => {
		$(event.target).prop("disabled", true);
		$("#tracker-layers-wrapper").addClass("d-none");
		map[map.findIndex(x => x.id == getActiveMap().id)].active = 0;
		$("li.tracker-map-item").find('.tracker-map-name[data-active="1"]').attr("data-active", 0).parent().find("input.tracker-map-status").prop("checked", false).prop("disabled", false);  
		$(event.target).parents("div.switch__container").children(".tracker-map-name").attr("data-active", 1);
		map[map.findIndex(x => x.id == $(event.target).parents("div.switch__container").children(".tracker-map-name").attr("id"))].active = 1;
		initGoogleMap();
		setLayer(); 	
		setCheckpoint();
		setTabs();
		fetchCheckpoints();
		updateLocalStorage("map");
	}));

	//Shows add map wrapper 
	$("#add-map-btn").click(() => {
		$("#tracker-all-map-wrapper, #tracker-layers-wrapper").addClass("d-none");
		$("#tracker-map-lock-position").prop("checked") ? googleMap.setOptions({draggable: false}) : googleMap.setOptions({draggable: true});
		$("#tracker-add-map-wrapper, #map-canvas").removeClass("d-none");
		// $("#tracker-map-list").addClass("no-pointer-events");
	});

	//Shows edit map wrapper 
	$("#tracker-map-list").on("click", '.tracker-map-item .map-edit-icon', ( event => {
		//$(event.target).parent().find("input.tracker-map-status").click();
		mapEditFlag = true;
		let activeMap = getActiveMap();
		$("#tracker-all-map-wrapper, #tracker-layers-wrapper").addClass("d-none");
		$("#map-header-title-face").text("Edit");
		$("#map-title").val(activeMap.name);
		M.updateTextFields();
		$("#map-add").prop("disabled", false);
		$("#tracker-map-lock-position").prop("checked", !getActiveMap().draggable);
		$("#map-delete-btn, #tracker-add-map-wrapper").removeClass("d-none");		
	}));

	//Hides add map wrapper 
	$("#close-addMap-btn").click(() => {
		// $("#add-map-btn").removeClass("d-none");
		$("#tracker-add-map-wrapper").addClass("d-none");
		$("#tracker-all-map-wrapper").removeClass("d-none");
		if(mapEditFlag) {
			$("#map-header-title-face").text("Add");
			$("#map-title").val("");
			$("#map-title").blur();
			$("#map-add").prop("disabled", true);
			$("#tracker-map-location-search").val("");
			$("#tracker-map-lock-position").prop("checked", false);
			mapEditFlag = !mapEditFlag;
		}
		if( getActiveMap() !== undefined) {
			getActiveMap().draggable ? googleMap.setOptions({draggable: true}) : googleMap.setOptions({draggable: false});
		} else {
			$("#map-canvas").addClass("d-none");
		}
		showLayersCheck();
		// $("#tracker-map-list").removeClass("no-pointer-events");
	});

	//Shows edit map wrapper 
	$("#tracker-component").on("click", '#map-delete-btn', ( event => {
		$("#tracker-add-map-wrapper").addClass("d-none");
		$("#tracker-all-map-wrapper").removeClass("d-none");
		if(mapEditFlag) {
			$("#map-header-title-face").text("Add");
			$("#map-title").val("");
			$("#map-title").blur();
			$("#map-add").prop("disabled", true);
			$("#tracker-map-location-search").val("");
			$("#tracker-map-lock-position").prop("checked", false);
			mapEditFlag = !mapEditFlag;
		}
		if( getActiveMap() !== undefined) {
			getActiveMap().draggable ? googleMap.setOptions({draggable: true}) : googleMap.setOptions({draggable: false});
		} else {
			$("#map-canvas").addClass("d-none");
		}
		showLayersCheck();
		map.splice(map.findIndex(x => x.id == getActiveMap().id), 1);
		updateLocalStorage("map");
	}));

	//Fires when a new map is added
	$("#map-add").click(() => {
		if($("#map-title").val() !== "") {
			let oldMapSet, newMapSet = [];
			let mapList = $("#tracker-map-list");
			let newMap = {
				"id" : getUID(),
				"name" : $("#map-title").val(),
				"center" : googleMap.getCenter().toJSON(),
				"layer" : initialLayer,
				"draggable" : !$("#tracker-map-lock-position").prop("checked"),
				"active" : 1,
				"zoom" : googleMap.getZoom()
			};
			if(map) {
				$("#" + getActiveMap().id).attr("data-active", 0).parent().find("input.tracker-map-status").prop("checked", false).prop("disabled", false); 
				map[map.findIndex(x => x.id == getActiveMap().id)].active = 0;
				map.push(newMap);
			} else {
				map = [newMap];
				$("#tracker-noMaps-label").addClass("d-none");
				mapList.removeClass("d-none");
			}
			mapList.append(addMapItem(newMap.id, newMap.name, newMap.active));
			$("#" + getActiveMap().id).parent().find("input.tracker-map-status").prop("checked", true);
			setLayer();
			setTabs();
			updateLocalStorage(dataSet[0]);
			// $("#add-map-btn").removeClass("d-none");
			// mapList.removeClass("no-pointer-events");
			$("#tracker-add-map-wrapper").addClass("d-none");
			$("#tracker-all-map-wrapper").removeClass("d-none");
			$("#map-title").val("");
			$("#map-title").blur();
			$("#map-add").prop("disabled", true);
			$("#tracker-map-location-search").val("");
			$("#tracker-map-lock-position").prop("checked", false);
		}
		// fetchMaps();
		// fetchLayers();
		//fetchCheckpoints();
	});	

	//Fires when status of any layer changes
	$("#tracker-layer-list").on("change", '.tracker-layer-item input.tracker-layer-status[type="checkbox"]', event => {
		$("li.tracker-layer-item input.tracker-layer-status").prop("disabled", true);
		$(event.target).prop("checked") ? $(event.target).parents("div.switch__container").children(".tracker-layer-name ").attr("data-active", 1) : $(event.target).parents("div.switch__container").children(".tracker-layer-name").attr("data-active", 0);
		map[map.findIndex(x => x.id == getActiveMap().id)].layer = getActiveLayerSet();
		setTabs();
		updateLocalStorage("map");
		$("li.tracker-layer-item input.tracker-layer-status").prop("disabled", false);
	});

	//Event Handlers on Tab 1(Map) --end


	//Event Handlers on Tab 2(Track) --start

	//Fires when input for checkpoint title on add checkpoint wrapper is changed 
	$("#cp-title").change(() => {
		saveCheckpointCheck();
	});

	//Shows add checkpoint wrapper 
	$("#add-cp-btn").click(() => {
		$("#add-cp-btn").addClass("d-none");
		$("#tracker-cp-loc").addClass("loc-blinker");
		setTooltip($("#tracker-cp-loc"), "Waiting for checkpoint location");
		$("#add-checkpoint-wrapper, #close-addCp-btn").removeClass("d-none");
		newMarkerFlag = false;
		activateMarkerSelection();
	});

	//Hides add checkpoint wrapper 
	$("#add-cp-header").on("click", '#close-addCp-btn', (event) => {
		removeAddCheckpoint();
	});

	//Fires when a new checkpoint is added
	$("#cp-add").click(() => {
		let cpSet = [];
		let newCp = {
			"id" : getUID(),
			"name" : $("#cp-title").val(),
			"map" : getActiveMap().id,
			"position" : markers[markers.length-1].getPosition(),
			"layer" : $("#cp-type").val()
		};
		if (checkLocalStorage()) {
			if(localStorage.getItem("checkpoint")) {
				cpSet = JSON.parse(localStorage.getItem("checkpoint"));
				cpSet.push(newCp);
				localStorage.setItem("checkpoint", JSON.stringify(cpSet));
			} else {
				localStorage.setItem("checkpoint", JSON.stringify([newCp]));
			}
		}
		fetchCheckpoints();		
		removeAddCheckpoint();
		$("#cp-title").val("");
		$("#cp-title").blur();
	});

	//Event Handlers on Tab 2(Track) --end
	
	//Event Handlers on Tab 3(Rostering/Personell) --start
	//Event Handlers on Tab 3(Rostering/Personell) --end


	//Event Handlers on Tab 4(Signsplan) --start
	//Event Handlers on Tab 4(Signsplan) --end

	//Event Handlers on Tab 5(Bannerplan) --start
	//Event Handlers on Tab 5(Bannerplan) --end

	$(".tracker-sign-icon").click((event) => {
		$(event.target).toggleClass("active");
		$(".tracker-sign-icon").not(event.target).removeClass("active");
	});

	$(".tracker-banner-icon").click((event) => {
		$(event.target).toggleClass("active");
		$(".tracker-banner-icon").not(event.target).removeClass("active");
	});
	
	$(".tracker-sign-icon").on('dragstart', function() {
		return false;
	});

	$(".tracker-sign-icon").mousedown((event) => {
		let draggedItem = event.target;
		let currentDroppable = null; 
		let shiftX = event.clientX - draggedItem.getBoundingClientRect().left;
		let shiftY = event.clientY - draggedItem.getBoundingClientRect().top;
		console.log(draggedItem);
		draggedItem.style.position = "absolute";
		draggedItem.style.zIndex = 1000;
		document.body.append(draggedItem);
		moveAt(event.pageX, event.pageY);
		function moveAt(pageX, pageY) {
			draggedItem.style.left = pageX - shiftX + 'px';
			draggedItem.style.top = pageY - shiftY + 'px';
		}
		function onMouseMove(event) {
			moveAt(event.pageX, event.pageY);
			draggedItem.hidden = true;
			let elemBelow = document.elementFromPoint(event.clientX, event.clientY);
			draggedItem.hidden = false;
			if (!elemBelow) return;
			let droppableBelow = elemBelow.closest('.droppable');
			if (currentDroppable != droppableBelow) { 
				if (currentDroppable) {
					//leaveDroppable(currentDroppable);
					currentDroppable.style.borderColor = "#ccc"; 
					currentDroppable.classList.remove("selected");
				}
				currentDroppable = droppableBelow;
				if (currentDroppable) {
					//enterDroppable(currentDroppable);
					droppableBelow.style.borderColor = "#00b2ee"; 
					droppableBelow.classList.add("selected");
				}
			}
		}
		document.addEventListener('mousemove', onMouseMove);
		draggedItem.onmouseup = function() {
			document.removeEventListener('mousemove', onMouseMove);
			draggedItem.onmouseup = null;
			$(".checkpoint-gtag").each(() => {
				if($(this).hasClass("selected")) {
					console.log("on selected!!");
				}
			});

		};
	});

});

function toggleMenu(x) {
	x.classList.toggle("menu-change");
	var effect = 'slide',
	options = { direction:"right"},
	duration = 250;
	$(".tracker-map-wrapper").toggle();
	document.getElementById("tracker-wrap").classList.toggle("full-view-width");
	$('#tracker-wrap').toggle(effect, options, duration);
	$('ul.tabs').tabs({
		swipeable: true
	});
}

/*
//Commented code - To further extend functionalities --start

	function addLayer() {
		if($("#tracker-add-layer-wrapper").hasClass("d-none")) {
			$("#tracker-add-layer-wrapper").removeClass("d-none");
		} else {
			$("#tracker-add-layer-wrapper").addClass("d-none");
		}
	}

	To add new Layer to Database
	$("#layer-add").click(() => {
		if($("#layer-title").val() !== "") {
			let newLayer, storedLayers, newData = [];
			if (checkLocalStorage()) {
				if(localStorage.getItem("layer")) {
					storedLayers = JSON.parse(localStorage.getItem("layer"));
					storedLayers.forEach( item => {
						// item.active = 0;
						newData.push(item);
					});
					newLayer = {
						"id" : getUID(),
						"name" : $("#layer-title").val(),
						"active" : 1,
						"map" : getActiveMap()	
					};
					//newData.push(storedMap);
					newData.push(newLayer);
					localStorage.setItem("layer", JSON.stringify(newData));
				} else {
					newLayer = [{
						"id" : getUID(),
						"name" : $("#layer-title").val(),
						"active" : 1,
						"map" : getActiveMap()
					}];
					localStorage.setItem("layer", JSON.stringify(newLayer));
				}
			}
		}
		fetchLayers();
		$("#tracker-add-layer-wrapper").addClass("d-none");
	});

//Commented code - To further extend functionalities --end
*/