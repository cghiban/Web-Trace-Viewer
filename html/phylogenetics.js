/*
	The contents of this file are subject to the terms listed in the LICENSE file
	you received with this code.
*/


(function() {
	var xZoom = 1;
	var yZoom = 1;
	var yLimit = 80; // max y a trace can have, so the graph stays in the canvas

	phy = function() {
		data: {}
	};
	
	//---------------------------------------------------------
	//
	//---------------------------------------------------------
	 phy.zoomReset = function() {

		//alert(this.data);
		$('zoom_reset').disabled = true;
		yZoom = xZoom = 1;
		//phy.draw();
		phy.prepare_draw();
		$('zoom_reset').disabled = false;
	}
	phy.zoomIn = function(axis) {
		$(axis + '_zoom_in').disabled = true;
		var zVar = axis + 'Zoom';
		eval(zVar + " *= 1.3");
		phy.prepare_draw();
		$(axis + '_zoom_in').disabled = false;
	}

	phy.zoomOut = function(axis) {
		$(axis + '_zoom_out').disabled = true;
		var zVar = axis + 'Zoom';
		eval(zVar + " /= 1.3");
		phy.prepare_draw();
		$(axis + '_zoom_out').disabled = false;
	}
	//---------------------------------------------------------
	phy.prepare_draw = function(d) {
		
		if (d)
			phy.data = d;
		
		// Get the data
		var display_id = phy.data['d'] || 'unnamed';
		
		var sequence = phy.data['s'] || '';
		var traces = {};

		['A', 'T', 'C', 'G'].each(function(base, i) {
			var arr = [];
			phy.data[base].each(function(b){
				arr.push(b);
				//arr.push(parseInt(b, 10));
			});
			traces[base] = arr;
		});
		
		var data = {
			seq_display_id : display_id,
			sequence : sequence,
			qscores : phy.data['q'],
			trace_values: traces,
			base_locations: phy.data['l']
		};
		
		phy.draw(data, 'canvas1');
	};
	//---------------------------------------------------------
	
	phy.draw = function(data, canvasID) {
	
		var canvas = $(canvasID);       
		if (!canvas.getContext)
			return;
			
		var padding = 5;
		var height = 200;
		var baseCallYPos = 30;
		var qualScoreSectionHeight = 30;
		var qualScoreYPos = baseCallYPos + qualScoreSectionHeight;
		var baseLocationYPos = 70;
		var ctx = canvas.getContext('2d');
		
		var title = data['seq_display_id'];
		var sequence = data['sequence'];
		var qualityScores = data['qscores'];
		var a_trace_values = data['trace_values']['A'];
		var t_trace_values = data['trace_values']['T'];
		var c_trace_values = data['trace_values']['C'];
		var g_trace_values = data['trace_values']['G'];
		var a_color = 'green';
		var t_color = 'red';
		var c_color = 'blue';
		var g_color = 'black';
		var baseLocations = data['base_locations']; // The position of the base in the entire sequence
		var baseLocationsPositions = []; // The position of the base on the canvas (in our subsequence)

		
		var offset = 0;
		// 'offset' only exists for the consensus sequence. If represents how many
		// bases the consensus trace should be offset by, in the event that there are
		// less than 3 nucleotides in the sequence preceeding the base in question. 
		// The purpose of this is to put the base in question in the middle of the mini
		// consensus trace canvas (in between the 2 vertical lines) for a consistent look. 
		//
		// This function offsets the base locations, q scores, and sequence by the
		// required offset (1 - 3). The trace itself is offset in the drawTrace fxn.
		if (data['offset'] && data['offset'] != 0){
			offset = data['offset'];
			var startingPoint = baseLocations[0];
			for (var i = 1; i <= offset; i++){
				baseLocations.splice(i - 1, 0, startingPoint - ((offset-i+1)*15));
				qualityScores.splice(0, 0, 0);
				sequence = " " + sequence;
			}
		}
		
		// Normalize the base locations to baseLocationsPositions
		for (var b = 0; b < baseLocations.length; b++){
			baseLocationsPositions[b] = baseLocations[b] - baseLocations[0];
		}
		
		var lastBase = Math.max.apply(Math, baseLocationsPositions);
		
		// Calculate the width of the canvas.
		// If it's the consensus editor, make it the width of the Display ID (unless the trace
		// runs longer than than the Display ID, then set it to the width of the trace).
		// If it's the View Sequences (entire sequence), make it the width of the entire sequence.
		// ('seq_id' is only passed from the consensus editor - that's how we check)
		if (data['seq_id']){
			if (ctx.measureText(title).width > lastBase){
				canvas.width = ctx.measureText(title).width + 15;
				}
			else{
				canvas.width = lastBase + 15;
			}
		}
		else {
			canvas.width = lastBase * xZoom + 15;
		}
	
		function drawTrace(n, color){
			ctx.strokeStyle = color;
			ctx.beginPath();		
			ctx.moveTo(padding + (offset * 15), height - padding);
			n.each(function(x, i) {
				var y = height - padding - x * yZoom;
				
				if (y < yLimit){
					y = yLimit;
				}
				
				ctx.lineTo(padding + (i * xZoom) + (offset * 15), y);
			});
			ctx.stroke();
			ctx.closePath();
		}
		drawTrace(a_trace_values, a_color);
		drawTrace(t_trace_values, t_color);
		drawTrace(c_trace_values, c_color);
		drawTrace(g_trace_values, g_color);

		// Draw The Labels
		ctx.fillStyle = "black";
		ctx.fillText(title, padding, 15);
		ctx.fillText("Quality", padding, 43); 
		ctx.fillText("Trace", padding, 83);
		ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
		ctx.fillRect(padding - 2, 4, ctx.measureText(title).width + 4, 14);
		ctx.fillRect(padding - 2, 32, 38, 14);
		ctx.fillRect(padding - 2, 72, 31, 14);
		
		// Draw the 'Quality Score = 20' line (99% accuracy line)
		// Setting line to 5 instead of 20 since I will divide all 
		// the QS's by 4 (so they fit in the designated height of 50px)
		ctx.strokeStyle = "#33CCFF";
		ctx.beginPath();
		ctx.moveTo(padding, qualScoreYPos - 5.5);
		ctx.lineTo(canvas.width - padding, qualScoreYPos - 5.5);
		ctx.stroke();
		ctx.closePath();

		
		// Draw The Base Calls at the appropriate base locations
		var i = 0;
		//for (var x in baseLocations){
		baseLocationsPositions.each(function(bl, i) {
			var base = sequence.charAt(i);
			switch (base){
				case 'A':
				ctx.fillStyle = "green";
  				break;
				case 'T':
		  		ctx.fillStyle = "red";
  				break;
				case 'C':
  				ctx.fillStyle = "blue";
  				break;
				case 'G':
  				ctx.fillStyle = "black";
  				break;
				case 'N':
  				ctx.fillStyle = "black";
  				break;
			}
			ctx.fillText(base, padding + bl * xZoom, baseCallYPos);

			if (!data['seq_id']){
				if ((i + 1)%10 == 0){
					ctx.fillStyle = "black";
					ctx.fillText(i + 1, padding + bl * xZoom - 3, baseLocationYPos);
				}
			}
		});
						
		// Draw The Quality Score Bars
		// The width of the Quality Score bar is calculated in this way so 
		// that it matches the width of a single nucleotide base call no			
		// matter what font or size it is. 
		// Note: I'm dividing the quality score values by 4 so eveything fits
		// in the designated 50px area
		var nucleotideWidth = ctx.measureText(sequence).width / sequence.length;
		ctx.fillStyle = "rgba(0, 0, 200, 0.5)";

		if (qualityScores.length) {
			baseLocationsPositions.each(function(bl, i) {
				ctx.fillRect(
						padding + bl * xZoom, qualScoreYPos - qualityScores[i]/4, 
						nucleotideWidth, qualityScores[i]/4
					);
			});
		}
		else{
			ctx.fillStyle = "black";
			ctx.fillText("Alert: No quality scores for this trace file", 50, 43); 
			ctx.fillStyle = "rgba(255, 255, 0, 0.2)";
			ctx.fillRect(48, 32, 192, 14);
		}
		
		// Draw lines surrounding base in question (for consensus only)
		if (data['seq_id']){
			ctx.fillStyle = "#666666";
			ctx.fillRect(baseLocationsPositions[3] + 3, baseCallYPos - 10, 0.5, 185);
			ctx.fillRect(baseLocationsPositions[3] + 13, baseCallYPos - 10, 0.5, 185);
		}
	};
	
})();

function debug(msg) {
	try {
		var d = $('debug');
		if (d) d.update(msg);
		if (console) console.info(msg);
	}
	catch (e) {}
}


Event.observe(window, Prototype.Browser.IE ? 'load' : 'dom:loaded', function() {
	/*
	var ua = navigator.userAgent.match(/MSIE\s+(\d+)/);
	if (ua && ua.length > 1 && parseInt(ua[1], 10) < 9) {
		phy.zoomIn('x');
	}
	*/

	new Ajax.Request('data.txt', {
		method:'get',	
		//parameters: {'pid': pid, 'accession': accession},
		onSuccess: function(transport){
			var response = transport.responseText || "{'status':'error', 'message':'No response'}";
			var r = response.evalJSON();

			phy.prepare_draw(r);
		},
		onFailure: function(){
				alert('Something went wrong!\nAborting...');
			}
	});
	
	
	
	/*if (ua && ua.length > 1 && parseInt(ua[1], 10) < 9) {
		setTimeout("phy.zoomOut('x')", 100);
	}
	*/
});
