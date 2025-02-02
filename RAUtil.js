// ==UserScript==
// @name         WME RA Util
// @namespace    https://greasyfork.org/users/30701-justins83-waze
// @version      2025.02.02.01
// @description  Providing basic utility for RA adjustment without the need to delete & recreate
// @include      https://www.waze.com/editor*
// @include      https://www.waze.com/*/editor*
// @include      https://beta.waze.com/*
// @exclude      https://www.waze.com/user/editor*
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @connect      greasyfork.org
// @author       JustinS83
// @grant        GM_xmlhttpRequest
// @license      GPLv3
// @contributionURL https://github.com/WazeDev/Thank-The-Authors
// @downloadURL https://update.greasyfork.org/scripts/23616/WME%20RA%20Util.user.js
// @updateURL https://update.greasyfork.org/scripts/23616/WME%20RA%20Util.meta.js
// ==/UserScript==

/* global W */
/* global WazeWrap */
/* global OpenLayers */
/* global require */
/* global $ */
/* global _ */
/* global I18n */
/* eslint curly: ["warn", "multi-or-nest"] */

/*
non-normal RA color:#FF8000
normal RA color:#4cc600
*/
(function() {

    var RAUtilWindow = null;
    var UpdateSegmentGeometry;
    var MoveNode, MultiAction;
    var drc_layer;
	let wEvents;
    const SCRIPT_VERSION = GM_info.script.version.toString();
    const SCRIPT_NAME = GM_info.script.name;
    const DOWNLOAD_URL = GM_info.scriptUpdateURL;

    //var totalActions = 0;
    var _settings;
    const updateMessage = "WME 2.206 compatibility. <br><br>Thanks to lacmacca for the update!";

    function bootstrap(tries = 1) {

        if (W && W.map && W.model && require && WazeWrap.Ready){
            loadScriptUpdateMonitor();
            init();
        }
        else if (tries < 1000)
            setTimeout(function () {bootstrap(++tries);}, 200);
    }

    bootstrap();

    function loadScriptUpdateMonitor() {
        let updateMonitor;
        try {
            updateMonitor = new WazeWrap.Alerts.ScriptUpdateMonitor(SCRIPT_NAME, SCRIPT_VERSION, DOWNLOAD_URL, GM_xmlhttpRequest);
            updateMonitor.start();
        } catch (ex) {
            // Report, but don't stop if ScriptUpdateMonitor fails.
            console.error(`${SCRIPT_NAME}:`, ex);
        }
    }

    function init(){
        injectCss();
        UpdateSegmentGeometry = require('Waze/Action/UpdateSegmentGeometry');
        MoveNode = require("Waze/Action/MoveNode");
        MultiAction = require("Waze/Action/MultiAction");

        console.log("RA UTIL");
        console.log(GM_info.script);
        if(W.map.events)
		    wEvents = W.map.events;
	    else
		    wEvents = W.map.getMapEventsListener();

        RAUtilWindow = document.createElement('div');
        RAUtilWindow.id = "RAUtilWindow";
        RAUtilWindow.style.position = 'fixed';
        RAUtilWindow.style.visibility = 'hidden';
        RAUtilWindow.style.top = '15%';
        RAUtilWindow.style.left = '25%';
        RAUtilWindow.style.width = '510px';
        RAUtilWindow.style.zIndex = 100;
        RAUtilWindow.style.backgroundColor = '#FFFFFE';
        RAUtilWindow.style.borderWidth = '0px';
        RAUtilWindow.style.borderStyle = 'solid';
        RAUtilWindow.style.borderRadius = '10px';
        RAUtilWindow.style.boxShadow = '5px 5px 10px Silver';
        RAUtilWindow.style.padding = '4px';

        var alertsHTML = '<div id="header" style="padding: 4px; background-color:#92C3D3; border-radius: 5px;-moz-border-radius: 5px;-webkit-border-radius: 5px; color: white; font-weight: bold; text-align:center; letter-spacing: 1px;text-shadow: black 0.1em 0.1em 0.2em;"><img src="https://storage.googleapis.com/wazeopedia-files/1/1e/RA_Util.png" style="float:left"></img> Roundabout Utility <a data-toggle="collapse" href="#divWrappers" id="collapserLink" style="float:right"><span id="collapser" style="cursor:pointer;padding:2px;color:white;" class="fa fa-caret-square-o-up"></a></span></div>';
        // start collapse // I put it al the beginning
      alertsHTML += '<div id="divWrappers" class="collapse in">';
         //***************** Round About Angles **************************
         alertsHTML += '<p style="margin: 10px 0px 0px 20px;"><input type="checkbox" id="chkRARoundaboutAngles">&nbsp;Enable Roundabout Angles</p>';
         //***************** Shift Amount **************************
         // Define BOX
         alertsHTML += '<div id="contentShift" style="text-align:center;float:left; width: 120px;max-width: 24%;height: 170px;margin: 1em 5px 0px 0px;opacity:1;border-radius: 2px;-moz-border-radius: 2px;-webkit-border-radius: 4px;border-width:1px;border-style:solid;border-color:#92C3D3;padding:2px;}">';
         alertsHTML += '<b>Shift amount</b></br><input type="text" name="shiftAmount" id="shiftAmount" size="1" style="float: left; text-align: center;font: inherit; line-height: normal; width: 30px; height: 20px; margin: 5px 4px; box-sizing: border-box; display: block; padding-left: 0; border-bottom-color: rgba(black,.3); background: transparent; outline: none; color: black;" value="1"/> <div style="margin: 5px 4px;">Meter(s)';
            // Shift amount controls
            alertsHTML += '<div id="controls" style="text-align:center; padding:06px 4px;width=100px; height=100px;margin: 5px 0px;border-style:solid; border-width: 2px;border-radius: 50%;-moz-border-radius: 50%;-webkit-border-radius: 50%;box-shadow: inset 0px 0px 50px -14px rgba(0,0,0,1);-moz-box-shadow: inset 0px 0px 50px -14px rgba(0,0,0,1);-webkit-box-shadow: inset 0px 0px 50px -14px rgba(0,0,0,1); background:#92C3D3;align:center;">';
            //Single Shift Up Button
            alertsHTML += '<span id="RAShiftUpBtn" style="cursor:pointer;font-size:14px;">';
            alertsHTML += '<i class="fa fa-angle-double-up fa-2x" style="color: white; text-shadow: black 0.1em 0.1em 0.2em; vertical-align: top;"> </i>';
            alertsHTML += '<span id="UpBtnCaption" style="font-weight: bold;"></span>';
            alertsHTML += '</span><br>';
            //Single Shift Left Button
            alertsHTML += '<span id="RAShiftLeftBtn" style="cursor:pointer;font-size:14px;margin-left:-40px;">';
            alertsHTML += '<i class="fa fa-angle-double-left fa-2x" style="color: white; text-shadow: black 0.1em 0.1em 0.2em; vertical-align: middle"> </i>';
            alertsHTML += '<span id="LeftBtnCaption" style="font-weight: bold;"></span>';
            alertsHTML += '</span>';
            //Single Shift Right Button
            alertsHTML += '<span id="RAShiftRightBtn" style="float: right;cursor:pointer;font-size:14px;margin-right:5px;">';
            alertsHTML += '<i class="fa fa-angle-double-right fa-2x" style="color: white;text-shadow: black 0.1em 0.1em 0.2em;  vertical-align: middle"> </i>';
            alertsHTML += '<span id="RightBtnCaption" style="font-weight: bold;"></span>';
            alertsHTML += '</span><br>';
            //Single Shift Down Button
            alertsHTML += '<span id="RAShiftDownBtn" style="cursor:pointer;font-size:14px;margin-top:0px;">';
            alertsHTML += '<i class="fa fa-angle-double-down fa-2x" style="color: white;text-shadow: black 0.1em 0.1em 0.2em;  vertical-align: middle"> </i>';
            alertsHTML += '<span id="DownBtnCaption" style="font-weight: bold;"></span>';
            alertsHTML += '</span>';
         alertsHTML += '</div></div></div>';
         //***************** Rotation **************************
         // Define BOX
         alertsHTML += '<div id="contentRotate" style="float:left; text-align: center;width: 120px;max-width: 24%;max-height:145px;margin: 1em auto;opacity:1;border-radius: 2px;-moz-border-radius: 2px;-webkit-border-radius: 4px;border-width:1px;border-style:solid;border-color:#92C3D3;padding:2px;  display:inline-block; border-style:solid; border-width:1px; height:152px;  margin-right:5px;">';
         alertsHTML += '<b>Rotation amount</b></br><input type="text" name="rotationAmount" id="rotationAmount" size="1" style="float: left; text-align: center;font: inherit; line-height: normal; width: 30px; height: 20px; margin: 5px 4px; box-sizing: border-box; display: block; padding-left: 0; border-bottom-color: rgba(black,.3); background: transparent; outline: none; color: black;" value="1"/> <div style="margin: 5px 4px;">Degree(s)';
            // Rotation controls
            alertsHTML += '<div id="rotationControls" style="padding: 6px 4px;width=100px; margin: 20px 0px 50px 0px;align:center;">';
               // Rotate Button on the Left
               alertsHTML += '<span id="RARotateLeftBtn" class="btnRotate" style="float: left;">';
               alertsHTML += '<i class="fa fa-undo fa-2x" style="color: white; text-shadow: black 0.1em 0.1em 0.2em; padding:2px;"> </i>';
               alertsHTML += '<span id="RotateLeftBtnCaption" style="font-weight: bold;"></span>';
               alertsHTML += '</span>';
               // Rotate button on the Right
               alertsHTML += '<span id="RARotateRightBtn" class="btnRotate" style="float: right;">';
               alertsHTML += '<i class="fa fa-repeat fa-2x" style="color: white; text-shadow: black 0.1em 0.1em 0.2em; padding:2px;"> </i>';
               alertsHTML += '<span id="RotateRightBtnCaption" style="font-weight: bold;"></span>';
         alertsHTML += '</div></div></div>';
         //********************* Diameter change ******************
         // Define BOX
         alertsHTML += '<div id="diameterChange" style="float:left; text-align: center;width: 120px;max-width: 24%;max-height:145px;margin: 1em auto;opacity:1;border-radius: 2px;-moz-border-radius: 2px;-webkit-border-radius: 4px;border-width:1px;border-style:solid;border-color:#92C3D3;padding:2px;  display:inline-block; border-style:solid; border-width:1px; height:152px;  margin-right:5px;">';
         alertsHTML += '<b>Change diameter</b></br></br>';
              // Diameter Change controls
            alertsHTML += '<div id="DiameterChangeControls" style="padding: 6px 4px;width=100px; margin: 5px 7px 50px 7px;align:center;">';
               // Decrease Button
               alertsHTML += '<span id="diameterChangeDecreaseBtn" style="float: left; width=45px; height=45px; background-color:#92C3D3; cursor:pointer; padding: 5px; font-size:14px; border:thin outset black; border-style:solid; border-width: 1px;border-radius: 50%;-moz-border-radius: 50%;-webkit-border-radius: 50%;box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);-moz-box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);-webkit-box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);">';
               alertsHTML += '<i class="fa fa-compress fa-2x" style="color: white; text-shadow: black 0.1em 0.1em 0.2em; padding:2px;;"> </i>';
               alertsHTML += '<span id="diameterChangeDecreaseCaption" style="font-weight: bold;"></span>';
               alertsHTML += '</span>';
               // Increase Button
               alertsHTML += '<span id="diameterChangeIncreaseBtn" style="float: right; width=45px; height=45px; background-color:#92C3D3; cursor:pointer; padding: 5px; font-size:14px; border:thin outset black; border-style:solid; border-width: 1px;border-radius: 50%;-moz-border-radius: 50%;-webkit-border-radius: 50%;box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);-moz-box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);-webkit-box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);">';
               alertsHTML += '<i class="fa fa-arrows-alt fa-2x" style="color: white; text-shadow: black 0.1em 0.1em 0.2em; padding:2px;"> </i>';
               alertsHTML += '<span id="diameterChangeIncreaseCaption" style="font-weight: bold;"></span>';
               alertsHTML += '</span>';
         alertsHTML += '</div></div>';
         //***************** Bump nodes **********************
         // Define BOX
         alertsHTML += '<div id="bumpNodes" style="float:left; text-align: center;width: 120px;max-width: 24%;max-height:145px;margin: 1em auto 0px auto;opacity:1;border-radius: 2px;-moz-border-radius: 2px;-webkit-border-radius: 4px;border-width:1px;border-style:solid;border-color:#92C3D3;padding:2px;  display:inline-block; border-style:solid; border-width:1px; height:152px;  margin-right:5px;">';
         alertsHTML += '<b>Move nodes</b></br>';
         // Move Nodes controls
         alertsHTML += '<div id="MoveNodesControls" style="padding: 2px;">';
            // Button A
            alertsHTML += '<div style="text-align:center; font-size:18px;">A Node';
               // Move node IN
               alertsHTML += '<p><span id="btnMoveANodeIn" class="btnMoveNode" style="color: white; font-size: 0.875em; text-shadow: black 0.1em 0.1em 0.2em; padding:3px 15px 3px 15px; margin:3px;">in</span>';
               // Move node OUT
               alertsHTML += '<span id="btnMoveANodeOut" class="btnMoveNode" class="btnMoveNode" style="color: white; font-size: 0.875em; text-shadow: black 0.1em 0.1em 0.2em; padding:3px 10px 3px 10px; margin:3px;">out</span>';
               alertsHTML += '</div>';
            // Button B
            alertsHTML += '<div style="text-align:center; font-size:18px;">B Node';
               // Move node IN
               alertsHTML += '<p><span id="btnMoveBNodeIn" class="btnMoveNode" style="color: white; font-size: 0.875em; text-shadow: black 0.1em 0.1em 0.2em; padding:3px 15px 3px 15px; margin:3px;">in</span>';
               // Move node OUT
               alertsHTML += '<span id="btnMoveBNodeOut" class="btnMoveNode" class="btnMoveNode" style="color: white; font-size: 0.875em; text-shadow: black 0.1em 0.1em 0.2em; padding:3px 10px 3px 10px; margin:3px;">out</span>';
               alertsHTML += '</div>';
        alertsHTML += '</div></div></div>';


        RAUtilWindow.innerHTML = alertsHTML;
        document.body.appendChild(RAUtilWindow);

        $('#RAShiftLeftBtn').click(RAShiftLeftBtnClick);
        $('#RAShiftRightBtn').click(RAShiftRightBtnClick);
        $('#RAShiftUpBtn').click(RAShiftUpBtnClick);
        $('#RAShiftDownBtn').click(RAShiftDownBtnClick);

        $('#RARotateLeftBtn').click(RARotateLeftBtnClick);
        $('#RARotateRightBtn').click(RARotateRightBtnClick);

        $('#diameterChangeDecreaseBtn').click(diameterChangeDecreaseBtnClick);
        $('#diameterChangeIncreaseBtn').click(diameterChangeIncreaseBtnClick);

        $('#btnMoveANodeIn').click(function(){moveNodeIn(WazeWrap.getSelectedFeatures()[0].WW.getObjectModel().attributes.id, WazeWrap.getSelectedFeatures()[0].WW.getObjectModel().attributes.fromNodeID);});
        $('#btnMoveANodeOut').click(function(){moveNodeOut(WazeWrap.getSelectedFeatures()[0].WW.getObjectModel().attributes.id, WazeWrap.getSelectedFeatures()[0].WW.getObjectModel().attributes.fromNodeID);});
        $('#btnMoveBNodeIn').click(function(){moveNodeIn(WazeWrap.getSelectedFeatures()[0].WW.getObjectModel().attributes.id, WazeWrap.getSelectedFeatures()[0].WW.getObjectModel().attributes.toNodeID);});
        $('#btnMoveBNodeOut').click(function(){moveNodeOut(WazeWrap.getSelectedFeatures()[0].WW.getObjectModel().attributes.id, WazeWrap.getSelectedFeatures()[0].WW.getObjectModel().attributes.toNodeID);});

        $('#shiftAmount').keypress(function(event) {
            if ((event.which != 46 || $(this).val().indexOf('.') != -1) && (event.which < 48 || event.which > 57))
                event.preventDefault();
        });

        $('#rotationAmount').keypress(function(event) {
            if ((event.which != 46 || $(this).val().indexOf('.') != -1) && (event.which < 48 || event.which > 57))
                event.preventDefault();
        });

        $('#collapserLink').click(function(){
            if($('#collapser').attr('class') == "fa fa-caret-square-o-down"){
                $("#collapser").removeClass("fa-caret-square-o-down");
                $("#collapser").addClass("fa-caret-square-o-up");
            }
            else{
                $("#collapser").removeClass("fa-caret-square-o-up");
                $("#collapser").addClass("fa-caret-square-o-down");
            }
            saveSettingsToStorage();
        });

        W.selectionManager.events.register("selectionchanged", null, checkDisplayTool);
        //W.model.actionManager.events.register("afterundoaction",null, undotriggered);
        //W.model.actionManager.events.register("afterclearactions",null,actionsCleared);

        var loadedSettings = $.parseJSON(localStorage.getItem("WME_RAUtil"));
        var defaultSettings = {
            divTop: "15%",
            divLeft: "25%",
            Expanded: true,
            RoundaboutAngles: true
        };
        _settings = loadedSettings ? loadedSettings : defaultSettings;

        $('#RAUtilWindow').css('left', _settings.divLeft);
        $('#RAUtilWindow').css('top', _settings.divTop);
        $("#chkRARoundaboutAngles").prop('checked', _settings.RoundaboutAngles);
        $("#chkRARoundaboutAngles").prop('checked', _settings.RoundaboutAngles);

        if(!_settings.Expanded){
            $("#divWrappers").removeClass("in");
            $("#divWrappers").addClass("collapse");
            $("#collapser").removeClass("fa-caret-square-o-up");
            $("#collapser").addClass("fa-caret-square-o-down");
        }

        $("#chkRARoundaboutAngles").click(function(){
            saveSettingsToStorage();

            if($("#chkRARoundaboutAngles").is(":checked")){
                wEvents.register("zoomend", null, DrawRoundaboutAngles);
                wEvents.register("moveend", null, DrawRoundaboutAngles);
                DrawRoundaboutAngles();
                drc_layer.setVisibility(true);
            }
            else{
                wEvents.unregister("zoomend", null, DrawRoundaboutAngles);
                wEvents.unregister("moveend", null, DrawRoundaboutAngles);
                drc_layer.setVisibility(false);
            }
        });

        if(_settings.RoundaboutAngles){
            wEvents.register("zoomend", null, DrawRoundaboutAngles);
            wEvents.register("moveend", null, DrawRoundaboutAngles);
            DrawRoundaboutAngles();
        }

        WazeWrap.Interface.ShowScriptUpdate("WME RA Util", GM_info.script.version, updateMessage, "https://greasyfork.org/en/scripts/23616-wme-ra-util", "https://www.waze.com/forum/viewtopic.php?f=819&t=211079");
    }

    function saveSettingsToStorage() {
        if (localStorage) {
            var settings = {
                divTop: "15%",
                divLeft: "25%",
                Expanded: true,
                RoundaboutAngles: true
            };

            settings.divLeft = $('#RAUtilWindow').css('left');
            settings.divTop = $('#RAUtilWindow').css('top');
            settings.Expanded = $("#collapser").attr('class').indexOf("fa-caret-square-o-up") > -1;
            settings.RoundaboutAngles = $("#chkRARoundaboutAngles").is(":checked");
            localStorage.setItem("WME_RAUtil", JSON.stringify(settings));
        }
    }

    function checkDisplayTool(){
        if(WazeWrap.hasSelectedFeatures() && WazeWrap.getSelectedFeatures()[0].WW.getType() === 'segment'){
            if(!AllSelectedSegmentsRA() || WazeWrap.getSelectedFeatures().length === 0)
                $('#RAUtilWindow').css({'visibility': 'hidden'});
            else{
                $('#RAUtilWindow').css({'visibility': 'visible'});
                if(typeof jQuery.ui !== 'undefined')
                    $('#RAUtilWindow' ).draggable({ //Gotta nuke the height setting the dragging inserts otherwise the panel cannot collapse
                        stop: function(event, ui) {
                            $('#RAUtilWindow').css("height", "");
                            saveSettingsToStorage();
                        }
                    });
                //checkSaveChanges();
                checkAllEditable(WazeWrap.Model.getAllRoundaboutSegmentsFromObj(WazeWrap.getSelectedFeatures()[0]));
            }
        }
        else{
            $('#RAUtilWindow').css({'visibility': 'hidden'});
            if(typeof jQuery.ui !== 'undefined')
                $('#RAUtilWindow' ).draggable({
                    stop: function(event, ui) {
                        $('#RAUtilWindow').css("height", "");
                        saveSettingsToStorage();
                    }
                });
        }
    }

    function checkAllEditable(RASegs){
        var $RAEditable = $('#RAEditable');
        var allEditable = true;
        var segObj, fromNode, toNode;

        for(let i=0; i<RASegs.length;i++){
            segObj = W.model.segments.getObjectById(RASegs[i]);
            fromNode = segObj.getFromNode();
            toNode = segObj.getToNode();

            if(segObj !== "undefined"){
                if(fromNode && fromNode !== "undefined" && !fromNode.areConnectionsEditable())
                    allEditable = false;
                else if(toNode && toNode !== "undefined" && !toNode.areConnectionsEditable())
                    allEditable = false;
                var toConnected, fromConnected;

                if(toNode){
                    toConnected = toNode.attributes.segIDs;
                    for(let j=0;j<toConnected.length;j++){
                        if(W.model.segments.getObjectById(toConnected[j]) !== "undefined")
                            if(W.model.segments.getObjectById(toConnected[j]).hasClosures())
                                allEditable = false;
                    }
                }

                if(fromNode){
                    fromConnected = fromNode.attributes.segIDs;
                    for(let j=0;j<fromConnected.length;j++){
                        if(W.model.segments.getObjectById(fromConnected[j]) !== "undefined")
                            if(W.model.segments.getObjectById(fromConnected[j]).hasClosures())
                                allEditable = false;
                    }
                }
            }
        }
        if(allEditable)
            $RAEditable.remove();
        else{
            if($RAEditable.length === 0){
                $RAEditable = $('<div>', {id:'RAEditable', style:'color:red'});
                $RAEditable.text('One or more segments are locked above your rank or have a closure.');
                $('#RAUtilWindow').append($RAEditable);
            }
        }
        return allEditable;
    }

    function AllSelectedSegmentsRA(){
        for (let i = 0; i < WazeWrap.getSelectedFeatures().length; i++){
            if(WazeWrap.getSelectedFeatures()[i].WW.getObjectModel().attributes.id < 0 || !WazeWrap.Model.isRoundaboutSegmentID(WazeWrap.getSelectedFeatures()[i].WW.getObjectModel().attributes.id))
                return false;
        }
        return true;
    }

    function ShiftSegmentNodesLat(segObj, latOffset){
        var RASegs = WazeWrap.Model.getAllRoundaboutSegmentsFromObj(segObj);
        if(checkAllEditable(RASegs)){
            var newGeometry, originalLength;
            var multiaction = new MultiAction();
            // multiaction.setModel(W.model);

            for(let i=0; i<RASegs.length; i++){
                segObj = W.model.segments.getObjectById(RASegs[i]);
                newGeometry = structuredClone(segObj.attributes.geoJSONGeometry);
                originalLength = segObj.attributes.geoJSONGeometry.coordinates.length;
                for(j=1; j < originalLength-1; j++){
                    newGeometry.coordinates[j][1] += latOffset;
                }
                //W.model.actionManager.add(new UpdateSegmentGeometry(segObj, segObj.geometry, newGeometry));
                multiaction.doSubAction(W.model, new UpdateSegmentGeometry(segObj, segObj.attributes.geoJSONGeometry, newGeometry));

                var node = W.model.nodes.objects[segObj.attributes.toNodeID];
                if(segObj.attributes.revDirection)
                    node = W.model.nodes.objects[segObj.attributes.fromNodeID];
                var newNodeGeometry = structuredClone(node.attributes.geoJSONGeometry);
                newNodeGeometry.coordinates[1] += latOffset;

                var connectedSegObjs = {};
                var emptyObj = {};
                for(var j=0;j<node.attributes.segIDs.length;j++){
                    var segid = node.attributes.segIDs[j];
                    connectedSegObjs[segid] = structuredClone(W.model.segments.getObjectById(segid).attributes.geoJSONGeometry);
                }
                //W.model.actionManager.add(new MoveNode(segObj, segObj.geometry, newNodeGeometry, connectedSegObjs, i));
                multiaction.doSubAction(W.model, new MoveNode(node, node.attributes.geoJSONGeometry, newNodeGeometry, connectedSegObjs, emptyObj));
                //W.model.actionManager.add(new MoveNode(node, node.geometry, newNodeGeometry));
                //totalActions +=2;
            }
            W.model.actionManager.add(multiaction);
        }
    }

    function ShiftSegmentsNodesLong(segObj, longOffset){
        var RASegs = WazeWrap.Model.getAllRoundaboutSegmentsFromObj(segObj);
        if(checkAllEditable(RASegs)){
            var newGeometry, originalLength;
            var multiaction = new MultiAction();
            // multiaction.setModel(W.model);

            //Loop through all RA segments & adjust
            for(let i=0; i<RASegs.length; i++){
                segObj = W.model.segments.getObjectById(RASegs[i]);
                newGeometry = structuredClone(segObj.attributes.geoJSONGeometry);
                originalLength = segObj.attributes.geoJSONGeometry.coordinates.length;
                for(let j=1; j < originalLength-1; j++){
                    newGeometry.coordinates[j][0] += longOffset;
                }
                //W.model.actionManager.add(new UpdateSegmentGeometry(segObj, segObj.geometry, newGeometry));
                multiaction.doSubAction(W.model, new UpdateSegmentGeometry(segObj, segObj.attributes.geoJSONGeometry, newGeometry));

                var node = W.model.nodes.objects[segObj.attributes.toNodeID];
                if(segObj.attributes.revDirection)
                    node = W.model.nodes.objects[segObj.attributes.fromNodeID];

                var newNodeGeometry = structuredClone(node.attributes.geoJSONGeometry);
                newNodeGeometry.coordinates[0] += longOffset;

                var connectedSegObjs = {};
                var emptyObj = {};
                for(let j=0;j<node.attributes.segIDs.length;j++){
                    var segid = node.attributes.segIDs[j];
                    connectedSegObjs[segid] = structuredClone(W.model.segments.getObjectById(segid).attributes.geoJSONGeometry);
                }
                //W.model.actionManager.add(new MoveNode(node, node.geometry, newNodeGeometry));
                multiaction.doSubAction(W.model, new MoveNode(node, node.attributes.geoJSONGeometry, newNodeGeometry, connectedSegObjs, emptyObj));
                //totalActions +=2;
            }
            W.model.actionManager.add(multiaction);
        }
    }

    function rotatePoints(origin, points, angle){
        var lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(points),null,null);
        lineFeature.geometry.rotate(angle, new OpenLayers.Geometry.Point(origin[0], origin[1]));
        return [].concat(lineFeature.geometry.components);
    }

    function RotateRA(segObj, angle){
        var RASegs = WazeWrap.Model.getAllRoundaboutSegmentsFromObj(segObj);
        var raCenter = W.model.junctions.objects[segObj.WW.getAttributes().junctionID].attributes.geoJSONGeometry.coordinates;

        if(checkAllEditable(RASegs)){
            var gps, newGeometry, originalLength;
            var multiaction = new MultiAction();
            // multiaction.setModel(W.model);

            //Loop through all RA segments & adjust
            for(let i=0; i<RASegs.length; i++){
                segObj = W.model.segments.getObjectById(RASegs[i]);
                newGeometry = structuredClone(segObj.attributes.geoJSONGeometry);
                originalLength = segObj.attributes.geoJSONGeometry.coordinates.length;

                var center = raCenter; //WazeWrap.Geometry.ConvertTo900913(raCenter.x, raCenter.y);
                var segPoints = [];
                //Have to copy the points manually (can't use .clone()) otherwise the geometry rotation modifies the geometry of the segment itself and that hoses WME.
                for(let j=0; j<originalLength;j++)
                    segPoints.push(new OpenLayers.Geometry.Point(segObj.attributes.geoJSONGeometry.coordinates[j][0], segObj.attributes.geoJSONGeometry.coordinates[j][1]));

                var newPoints = rotatePoints(center, segPoints, angle);

                for(let j=1; j<originalLength-1;j++){
                    newGeometry.coordinates[j] = [newPoints[j].x, newPoints[j].y];
                }

                //W.model.actionManager.add(new UpdateSegmentGeometry(segObj, segObj.geometry, newGeometry));
                multiaction.doSubAction(W.model, new UpdateSegmentGeometry(segObj, segObj.attributes.geoJSONGeometry, newGeometry));

                //**************Rotate Nodes******************
                var node = W.model.nodes.objects[segObj.attributes.toNodeID];
                if(segObj.attributes.revDirection)
                    node = W.model.nodes.objects[segObj.attributes.fromNodeID];

                var nodePoints = [];
                var newNodeGeometry = structuredClone(node.attributes.geoJSONGeometry);

                nodePoints.push(new OpenLayers.Geometry.Point(node.attributes.geoJSONGeometry.coordinates[0], node.attributes.geoJSONGeometry.coordinates[1]));
                nodePoints.push(new OpenLayers.Geometry.Point(node.attributes.geoJSONGeometry.coordinates[0], node.attributes.geoJSONGeometry.coordinates[1])); //add it twice because lines need 2 points

                gps = rotatePoints(center, nodePoints, angle);

                newNodeGeometry.coordinates = [gps[0].x, gps[0].y];

                var connectedSegObjs = {};
                var emptyObj = {};
                for(let j=0;j<node.attributes.segIDs.length;j++){
                    var segid = node.attributes.segIDs[j];
                    connectedSegObjs[segid] = structuredClone(W.model.segments.getObjectById(segid).attributes.geoJSONGeometry);
                }
                multiaction.doSubAction(W.model, new MoveNode(node, node.attributes.geoJSONGeometry, newNodeGeometry, connectedSegObjs, emptyObj));
                //totalActions +=2;
            }
            W.model.actionManager.add(multiaction);
        }
    }

    function RARotateLeftBtnClick(e){
        e.stopPropagation();
        var segObj = WazeWrap.getSelectedFeatures()[0];
        RotateRA(segObj, $('#rotationAmount').val());
    }

    function RARotateRightBtnClick(e){
        e.stopPropagation();

        var segObj = WazeWrap.getSelectedFeatures()[0];
        RotateRA(segObj, -$('#rotationAmount').val());
    }

    function ChangeDiameter(segObj, amount){
        var RASegs = WazeWrap.Model.getAllRoundaboutSegmentsFromObj(segObj);
        var raCenter = W.model.junctions.objects[segObj.WW.getAttributes().junctionID].attributes.geoJSONGeometry.coordinates;
        let { lon: centerX, lat: centerY } = WazeWrap.Geometry.ConvertTo900913(raCenter);

        if(checkAllEditable(RASegs)){
            var newGeometry, originalLength;

            //Loop through all RA segments & adjust
            for(let i=0; i<RASegs.length; i++){
                segObj = W.model.segments.getObjectById(RASegs[i]);
                newGeometry = structuredClone(segObj.attributes.geoJSONGeometry);
                originalLength = segObj.attributes.geoJSONGeometry.coordinates.length;

                for(let j=1; j < originalLength-1; j++){
                    let pt = segObj.attributes.geoJSONGeometry.coordinates[j];
                    let { lon: pointX, lat: pointY } = WazeWrap.Geometry.ConvertTo900913(pt);
                    let h = Math.sqrt(Math.abs(Math.pow(pointX - centerX, 2) + Math.pow(pointY - centerY, 2)));
                    let ratio = (h + amount)/h;
                    let x = centerX + (pointX - centerX) * ratio;
                    let y = centerY + (pointY - centerY) * ratio;

                    let { lon: newX, lat: newY } = WazeWrap.Geometry.ConvertTo4326([x, y]);
                    newGeometry.coordinates[j] = [newX, newY];
                }
                W.model.actionManager.add(new UpdateSegmentGeometry(segObj, segObj.attributes.geoJSONGeometry, newGeometry));

                var node = W.model.nodes.objects[segObj.attributes.toNodeID];
                if(segObj.attributes.revDirection)
                    node = W.model.nodes.objects[segObj.attributes.fromNodeID];

                var newNodeGeometry = structuredClone(node.attributes.geoJSONGeometry);
                let { lon: pointX, lat: pointY } = WazeWrap.Geometry.ConvertTo900913(newNodeGeometry.coordinates);
                let h = Math.sqrt(Math.abs(Math.pow(pointX - centerX, 2) + Math.pow(pointY - centerY, 2)));
                let ratio = (h + amount)/h;
                let x = centerX + (pointX - centerX) * ratio;
                let y = centerY + (pointY - centerY) * ratio;

                let { lon: newX, lat: newY } = WazeWrap.Geometry.ConvertTo4326([x, y]);
                newNodeGeometry.coordinates = [newX, newY];

                var connectedSegObjs = {};
                var emptyObj = {};
                for(let j=0;j<node.attributes.segIDs.length;j++){
                    var segid = node.attributes.segIDs[j];
                    connectedSegObjs[segid] = structuredClone(W.model.segments.getObjectById(segid).attributes.geoJSONGeometry);
                }
                W.model.actionManager.add(new MoveNode(node, node.attributes.geoJSONGeometry, newNodeGeometry, connectedSegObjs, emptyObj));
            }
            if(_settings.RoundaboutAngles)
                DrawRoundaboutAngles();
        }
    }

    function diameterChangeDecreaseBtnClick(e){
        e.stopPropagation();
        var segObj = WazeWrap.getSelectedFeatures()[0];
        ChangeDiameter(segObj, -1);
    }

    function diameterChangeIncreaseBtnClick(e){
        e.stopPropagation();
        var segObj = WazeWrap.getSelectedFeatures()[0];
        ChangeDiameter(segObj, 1);
    }

    function moveNodeIn(sourceSegID, nodeID){
        let isANode = true;
        let curSeg = W.model.segments.getObjectById(sourceSegID);
        if (curSeg.attributes.geoJSONGeometry.coordinates.length > 2) {
            if(nodeID === curSeg.attributes.toNodeID)
                isANode = false;
            //Add geo point on the other segment
            let node = W.model.nodes.getObjectById(nodeID);
            let currNodePOS = structuredClone(node.attributes.geoJSONGeometry.coordinates);
            let otherSeg; //other RA segment that we are adding a geo point to
            let nodeSegs = [...W.model.nodes.getObjectById(nodeID).attributes.segIDs];
            nodeSegs = _.without(nodeSegs, sourceSegID); //remove the source segment from the node Segs - we need to find the segment that is a part of the RA that is prior to our source seg
            for(let i=0; i<nodeSegs.length; i++){
                let s = W.model.segments.getObjectById(nodeSegs[i]);
                if(s.attributes.junctionID){
                    otherSeg = s;
                    break;
                }
            }

            var multiaction = new MultiAction();
            // multiaction.setModel(W.model);
            //note and remove first geo point, move junction node to this point
            var newNodeGeometry = { type: 'Point', coordinates: structuredClone(curSeg.attributes.geoJSONGeometry.coordinates[isANode ? 1 : curSeg.attributes.geoJSONGeometry.coordinates.length - 2]) };

            let newSegGeo = structuredClone(curSeg.attributes.geoJSONGeometry);
            newSegGeo.coordinates.splice(isANode ? 1 : newSegGeo.coordinates.length - 2, 1);
            multiaction.doSubAction(W.model, new UpdateSegmentGeometry(curSeg, curSeg.attributes.geoJSONGeometry, newSegGeo));

            //move the node
            var connectedSegObjs = {};
            var emptyObj = {};
            for(var j=0;j<node.attributes.segIDs.length;j++){
                var segid = node.attributes.segIDs[j];
                connectedSegObjs[segid] = structuredClone(W.model.segments.getObjectById(segid).attributes.geoJSONGeometry);
            }
            multiaction.doSubAction(W.model, new MoveNode(node, node.attributes.geoJSONGeometry, newNodeGeometry, connectedSegObjs, emptyObj));

            if((otherSeg.attributes.revDirection && !curSeg.attributes.revDirection) || (!otherSeg.attributes.revDirection && curSeg.attributes.revDirection))
                    isANode = !isANode;

            let newGeo = structuredClone(otherSeg.attributes.geoJSONGeometry);
            newGeo.coordinates.splice(isANode ? -1 : 1, 0, [currNodePOS[0], currNodePOS[1]]);

            multiaction.doSubAction(W.model, new UpdateSegmentGeometry(otherSeg, otherSeg.attributes.geoJSONGeometry, newGeo));
            W.model.actionManager.add(multiaction);

            if(_settings.RoundaboutAngles)
                DrawRoundaboutAngles();
        }
    }

    function moveNodeOut(sourceSegID, nodeID){
        let isANode = true;
        let curSeg = W.model.segments.getObjectById(sourceSegID);
        if(nodeID === curSeg.attributes.toNodeID)
            isANode = false;
        //Add geo point on the other segment
        let node = W.model.nodes.getObjectById(nodeID);
        let currNodePOS = structuredClone(node.attributes.geoJSONGeometry.coordinates);
        let otherSeg; //other RA segment that we are adding a geo point to
        let nodeSegs = [...W.model.nodes.getObjectById(nodeID).attributes.segIDs];
        nodeSegs = _.without(nodeSegs, sourceSegID); //remove the source segment from the node Segs - we need to find the segment that is a part of the RA that is after our source seg
        for(let i=0; i<nodeSegs.length; i++){
            let s = W.model.segments.getObjectById(nodeSegs[i]);
            if(s.attributes.junctionID){
                otherSeg = s;
                break;
            }
        }

        if(otherSeg.attributes.geoJSONGeometry.coordinates.length > 2){
            let newSegGeo = structuredClone(curSeg.attributes.geoJSONGeometry);
            newSegGeo.coordinates.splice(isANode ? 1 : newSegGeo.coordinates.length - 1, 0, [currNodePOS[0], currNodePOS[1]]);
            var multiaction = new MultiAction();
            // multiaction.setModel(W.model);
            multiaction.doSubAction(W.model, new UpdateSegmentGeometry(curSeg, curSeg.attributes.geoJSONGeometry, newSegGeo));
            if((otherSeg.attributes.revDirection && !curSeg.attributes.revDirection) || (!otherSeg.attributes.revDirection && curSeg.attributes.revDirection))
                isANode = !isANode;

            //note and remove first geo point, move junction node to this point
            var newNodeGeometry = { type: 'Point', coordinates: structuredClone(otherSeg.attributes.geoJSONGeometry.coordinates[isANode ? otherSeg.attributes.geoJSONGeometry.coordinates.length - 2 : 1]) };
            let newGeo = structuredClone(otherSeg.attributes.geoJSONGeometry);
            newGeo.coordinates.splice(isANode ? -2 : 1, 1);
            multiaction.doSubAction(W.model, new UpdateSegmentGeometry(otherSeg, otherSeg.attributes.geoJSONGeometry, newGeo));

            //move the node
            var connectedSegObjs = {};
            var emptyObj = {};
            for(var j=0; j < node.attributes.segIDs.length;j++){
                var segid = node.attributes.segIDs[j];
                connectedSegObjs[segid] = structuredClone(W.model.segments.getObjectById(segid).attributes.geoJSONGeometry);
            }
            multiaction.doSubAction(W.model, new MoveNode(node, node.attributes.geoJSONGeometry, newNodeGeometry, connectedSegObjs, emptyObj));
            W.model.actionManager.add(multiaction);

            if(_settings.RoundaboutAngles)
                DrawRoundaboutAngles();
        }
    }

    //Left
    function RAShiftLeftBtnClick(e){
        // this traps the click to prevent it falling through to the underlying area name element and potentially causing the map view to be relocated to that area...
        e.stopPropagation();

        //if(!pendingChanges){
        var segObj = WazeWrap.getSelectedFeatures()[0];
        var convertedCoords = WazeWrap.Geometry.ConvertTo4326(segObj.WW.getAttributes().geoJSONGeometry.coordinates[0][0], segObj.WW.getAttributes().geoJSONGeometry.coordinates[0][1]);
        var gpsOffsetAmount = WazeWrap.Geometry.CalculateLongOffsetGPS(-$('#shiftAmount').val(), convertedCoords.lon, convertedCoords.lat);
        ShiftSegmentsNodesLong(segObj, gpsOffsetAmount);
        //}
    }
    //Right
    function RAShiftRightBtnClick(e){
        // this traps the click to prevent it falling through to the underlying area name element and potentially causing the map view to be relocated to that area...
        e.stopPropagation();

        //if(!pendingChanges){
        var segObj = WazeWrap.getSelectedFeatures()[0];
        var convertedCoords = WazeWrap.Geometry.ConvertTo4326(segObj.WW.getAttributes().geoJSONGeometry.coordinates[0][0], segObj.WW.getAttributes().geoJSONGeometry.coordinates[0][1]);
        var gpsOffsetAmount = WazeWrap.Geometry.CalculateLongOffsetGPS($('#shiftAmount').val(), convertedCoords.lon, convertedCoords.lat);
        ShiftSegmentsNodesLong(segObj, gpsOffsetAmount);
        //}
    }
    //Up
    function RAShiftUpBtnClick(e){
        // this traps the click to prevent it falling through to the underlying area name element and potentially causing the map view to be relocated to that area...
        e.stopPropagation();

        //if(!pendingChanges){
        var segObj = WazeWrap.getSelectedFeatures()[0];
        var gpsOffsetAmount = WazeWrap.Geometry.CalculateLatOffsetGPS($('#shiftAmount').val(), WazeWrap.Geometry.ConvertTo4326(segObj.WW.getAttributes().geoJSONGeometry.coordinates[0][0], segObj.WW.getAttributes().geoJSONGeometry.coordinates[0][1]));
        ShiftSegmentNodesLat(segObj, gpsOffsetAmount);
        //}
    }
    //Down
    function RAShiftDownBtnClick(e){
        // this traps the click to prevent it falling through to the underlying area name element and potentially causing the map view to be relocated to that area...
        e.stopPropagation();

        //if(!pendingChanges){
        var segObj = WazeWrap.getSelectedFeatures()[0];
        var gpsOffsetAmount = WazeWrap.Geometry.CalculateLatOffsetGPS(-$('#shiftAmount').val(), WazeWrap.Geometry.ConvertTo4326(segObj.WW.getAttributes().geoJSONGeometry.coordinates[0][0], segObj.WW.getAttributes().geoJSONGeometry.coordinates[0][1]));
        ShiftSegmentNodesLat(segObj, gpsOffsetAmount);
        //}
    }

    //*************** Roundabout Angles **********************
    function DrawRoundaboutAngles() {
    let layers = W.map.getLayersBy("uniqueName", "__DrawRoundaboutAngles");
    if (layers.length > 0) {
        drc_layer = layers[0];
    } else {
        let drc_style = new OpenLayers.Style({
            fillOpacity: 0.0,
            strokeOpacity: 1.0,
            fillColor: "#FF40C0",
            strokeColor: "${strokeColor}",
            strokeWidth: 10,
            fontWeight: "bold",
            pointRadius: 0,
            label: "${labelText}",
            fontFamily: "Tahoma, Courier New",
            labelOutlineColor: "#FFFFFF",
            labelOutlineWidth: 3,
            fontColor: "${labelColor}",
            fontSize: "10px"
        });

        drc_layer = new OpenLayers.Layer.Vector("Roundabout Angles", {
            displayInLayerSwitcher: true,
            uniqueName: "__DrawRoundaboutAngles",
            styleMap: new OpenLayers.StyleMap(drc_style)
        });

        I18n.translations[I18n.currentLocale()].layers.name["__DrawRoundaboutAngles"] =
            "Roundabout Angles";
        W.map.addLayer(drc_layer);
        drc_layer.setVisibility(true);
    }

    // If layer turned off or zoomed out, remove features and bail
    if (!drc_layer.visibility || W.map.getZoom() < 1) {
        drc_layer.removeAllFeatures();
        return;
    }

    let rsegments = {};
    for (let segID in W.model.segments.objects) {
        let segObj = W.model.segments.getObjectById(segID);
        if (!segObj) continue;

        let jID = segObj.attributes.junctionID;
        if (jID != null) {
            if (!rsegments[jID]) {
                rsegments[jID] = [];
            }
            rsegments[jID].push(segObj);
        }
    }

    let drc_features = [];

    for (let junctionId in rsegments) {
        let raSegs = rsegments[junctionId];
        if (!raSegs.length) continue;

        // a) Get Waze’s stored junction center
        let junction = W.model.junctions.getObjectById(junctionId);
        if (!junction || !junction.geometry) {
            continue;
        }
        let sr_x = junction.geometry.x;
        let sr_y = junction.geometry.y;

        let nodeIds = new Set();
        for (let seg of raSegs) {
            nodeIds.add(seg.attributes.fromNodeID);
            nodeIds.add(seg.attributes.toNodeID);
        }
        let nodeObjs = [...nodeIds].map(id => W.model.nodes.getObjectById(id));

        let angles = [];
        let maxRadiusSq = -1;
        let furthestNodeIndex = 0;

        for (let i = 0; i < nodeObjs.length; i++) {
            let nd = nodeObjs[i];
            if (!nd || !nd.geometry) continue;

            let dx = nd.geometry.x - sr_x;
            let dy = nd.geometry.y - sr_y;
            let radiusSq = dx * dx + dy * dy;
            if (radiusSq > maxRadiusSq) {
                maxRadiusSq = radiusSq;
                furthestNodeIndex = i;
            }
            let angleDeg = Math.atan2(dy, dx) * (180.0 / Math.PI);
            if (angleDeg < 0) angleDeg += 360;
            angles.push(angleDeg);
        }

        let radius = Math.sqrt(maxRadiusSq);

        angles.sort((a, b) => a - b);
        angles.push(angles[0] + 360);

        let centerPt = new OpenLayers.Geometry.Point(sr_x, sr_y);
        let circleGeom = OpenLayers.Geometry.Polygon.createRegularPolygon(
            centerPt, radius, 50
        );
        let circleFeature = new OpenLayers.Feature.Vector(circleGeom, {
            labelText: "",
            labelColor: "#000000",
            strokeColor: "#4cc600" // color code for green
        });
        drc_features.push(circleFeature);

        let anglesDelta = [];
        for (let i = 0; i < angles.length - 1; i++) {
            let diff = angles[i + 1] - angles[i];
            anglesDelta.push(diff);
        }

        for (let i = 0; i < nodeObjs.length; i++) {
            let nd = nodeObjs[i];
            if (!nd || !nd.geometry) continue;
            let lineGeom = new OpenLayers.Geometry.LineString([
                new OpenLayers.Geometry.Point(sr_x, sr_y),
                new OpenLayers.Geometry.Point(nd.geometry.x, nd.geometry.y)
            ]);
            let lineFeature = new OpenLayers.Feature.Vector(lineGeom, {}, {
                strokeColor: "#4cc600",
                strokeWidth: 2
            });
            drc_features.push(lineFeature);
        }

        if (nodeObjs.length >= 2 && nodeObjs.length <= 4) {
            for (let i = 0; i < anglesDelta.length; i++) {
                let midAngleDeg = (angles[i] + angles[i + 1]) / 2;
                let midAngleRad = midAngleDeg * (Math.PI / 180);
                let ex = sr_x + Math.cos(midAngleRad) * (radius * 0.5);
                let ey = sr_y + Math.sin(midAngleRad) * (radius * 0.5);

                let color = "#004000"; // default color
                let angRounded = Math.round((anglesDelta[i] + Number.EPSILON) * 100) / 100;

                if (Math.abs(angRounded) > 15) color = "#FF0000";
                else if (Math.abs(angRounded) > 13) color = "#FFC000";

                let labelPt = new OpenLayers.Geometry.Point(ex, ey);
                drc_features.push(new OpenLayers.Feature.Vector(labelPt, {
                    labelText: angRounded + "°",
                    labelColor: color
                }));
            }
        }

        let furthestNode = nodeObjs[furthestNodeIndex];
        if (furthestNode && furthestNode.geometry) {
            let lineGeom2 = new OpenLayers.Geometry.LineString([
                new OpenLayers.Geometry.Point(sr_x, sr_y),
                new OpenLayers.Geometry.Point(
                    furthestNode.geometry.x,
                    furthestNode.geometry.y
                )
            ]);
            let geo_radius = lineGeom2.getGeodesicLength(W.map.getProjectionObject());
            let diam = (geo_radius * 2.0).toFixed(0) + "m";

            let centerLabel = new OpenLayers.Feature.Vector(centerPt.clone(), {
                labelText: diam,
                labelColor: "#000000"
            });
            drc_features.push(centerLabel);
        }
    }

    drc_layer.removeAllFeatures();
    drc_layer.addFeatures(drc_features);
}


    function injectCss() {
        var css = [
            '.btnMoveNode {width=25px; height=25px; background-color:#92C3D3; cursor:pointer; padding:5px; font-size:14px; border:thin outset black; border-style:solid; border-width: 1px;border-radius:50%; -moz-border-radius:50%; -webkit-border-radius:50%; box-shadow:inset 0px 0px 20px -14px rgba(0,0,0,1); -moz-box-shadow:inset 0px 0px 20px -14px rgba(0,0,0,1); -webkit-box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);}',
            '.btnRotate { width=45px; height=45px; background-color:#92C3D3; cursor:pointer; padding: 5px; font-size:14px; border:thin outset black; border-style:solid; border-width: 1px;border-radius: 50%;-moz-border-radius: 50%;-webkit-border-radius: 50%;box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);-moz-box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);-webkit-box-shadow: inset 0px 0px 20px -14px rgba(0,0,0,1);}'
        ].join(' ');
        $('<style type="text/css">' + css + '</style>').appendTo('head');
    }

})();
