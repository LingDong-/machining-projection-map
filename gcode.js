  // path to G-code
  //
  // Neil Gershenfeld 
  // (c) Massachusetts Institute of Technology 2018
  // 
  // Updated: Steven Chew
  // Date:    Feb 20 2019
  // Comments: Added option to output in inch or mm
  // Date:... Oct 28 2019
  // Comments: Corrected feedrate conversion
  //           - inch/s to inch/min
  //...........- mm/s to mm/min
  //
  // Updated: Neil Gershenfeld
  // Date: Oct 28 2020
  // Comments: added mm/s vs mm/min option
  //
  // This work may be reproduced, modified, distributed, performed, and 
  // displayed for any purpose, but must acknowledge the mods
  // project. Copyright is retained and must be preserved. The work is 
  // provided as is; no warranty is provided, and users accept all 
  // liability.

function path_to_gcode(mod_path,scale,mod) {
  // var scale = 1;
  // var dx = 25.4*mod.width/mod.dpi
  var cut_speed = mod.cutspeed
  var plunge_speed = mod.plungespeed
  var jog_height = mod.jogheight
  // var nx = mod.width
  // var scale = dx/(nx-1)
  // var in_mm_scale = 1
  if (mod.formatInch) {
    //  dx /= 25.4
     scale /= 25.4
     cut_speed /= 25.4
     plunge_speed /= 25.4
     jog_height /= 25.4
     }
  if (mod.unitMinutes) {
     cut_speed *= 60
     plunge_speed *= 60
     }
  var spindle_speed = parseFloat(mod.spindlespeed)
  var tool = parseInt(mod.tool)
  str = "%\n" // tape start
  str += "G17\n" // xy plane
  if (mod.formatInch)
     str += "G20\n" // inches
  if (mod.formatMm)
     str += "G21\n" // mm
  str += "G40\n" // cancel tool radius compensation
  str += "G49\n" // cancel tool length compensation
  // str += "G54\n" // coordinate system 1
  str += "G80\n" // cancel canned cycles
  str += "G90\n" // absolute coordinates
  str += "G94\n" // feed/minute units
  //str += "T"+tool+"M06\n" // tool selection, tool change // some interpreters have trouble with this
  str += "F"+cut_speed.toFixed(4)+"\n" // feed rate
  str += "S"+spindle_speed+"\n" // spindle speed
  if (mod.coolanton)
     str += "M08\n" // coolant on
  str += "G00Z"+jog_height.toFixed(4)+"\n" // move up before starting spindle
  str += "M03\n" // spindle on clockwise
  //str += "G04 P1000\n" // give spindle 1 second to spin up // some interpreters have trouble with this
  //
  // follow segments
  //
  for (var seg = 0; seg < mod_path.length; ++seg) {
     //
     // move up to starting point
     //
     x = scale*mod_path[seg][0][0]
     y = scale*mod_path[seg][0][1]
     str += "G00Z"+jog_height.toFixed(4)+"\n"
     str += "G00X"+x.toFixed(4)+"Y"+y.toFixed(4)+"Z"+jog_height.toFixed(4)+"\n"
     //
     // move down
     //
     z = scale*mod_path[seg][0][2]
     str += "G01Z"+z.toFixed(4)+" F"+plunge_speed.toFixed(4)+"\n"
     str += "F"+cut_speed.toFixed(4)+"\n" //restore xy feed rate
     for (var pt = 1; pt < mod_path[seg].length; ++pt) {
        //
        // move to next point
        //
        x = scale*mod_path[seg][pt][0]
        y = scale*mod_path[seg][pt][1]
        z = scale*mod_path[seg][pt][2]
        str += "G01X"+x.toFixed(4)+"Y"+y.toFixed(4)+"Z"+z.toFixed(4)+"\n"
        }
     }
  //
  // finish
  //
  str += "G00Z"+jog_height.toFixed(4)+"\n" // move up
  str += "G00X0.0000Y0.0000"+"Z"+jog_height.toFixed(4)+"\n" // finish at origin
  str += "M05\n" // spindle stop
  if (mod.coolanton)
     str += "M09\n" // coolant off
  str += "M30\n" // program end and reset
  str += "%\n" // tape end
  //
  // output file
  //
  return str;
}