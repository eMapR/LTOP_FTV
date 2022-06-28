var geometry2 = 
    /* color: #98ff00 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[105.26038489933978, 13.411894556381087],
          [105.26038489933978, 13.0589765550653],
          [105.99646888371481, 13.0589765550653],
          [105.99646888371481, 13.411894556381087]]], null, false),
    geometry = /* color: #0b4a8b */ee.Geometry.Point([105.64239213583369, 13.235495378665814]),
    geometry3 = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[101.7639151067401, 19.465046921973073],
          [101.7639151067401, 18.777364614793765],
          [103.3129873723651, 18.777364614793765],
          [103.3129873723651, 19.465046921973073]]], null, false),
    geometry4 = 
    /* color: #d63000 */
    /* shown: false */
    ee.Geometry.Point([103.04024450997451, 19.0519345305046]);




//######################################################################################################## 
//#                                                                                                    #\\
//#                             LANDTRENDR FTV IMAGE FITTING                                           #\\
//#                                                                                                    #\\
//########################################################################################################

// date: 2022-02-03
// author: Ben Roberts-Pierel | robertsb@oregonstate.edu
//         Peter Clary        | clarype@oregonstate.edu
//         Robert Kennedy     | rkennedy@coas.oregonstate.edu
// website: https://github.com/eMapR/LT-GEE
//updated to run for the country of Laos

//  This program takes seven inputs:
// 1. An aoi of your study area
// 2. The cluster image from the Kmeans process. This was an input for the 05lt_Optimum_Imager.js script 
// 3. The selected LandTrendr params from the LTOP process that was also used in the 05lt_Optimum_Imager.js script. This should line up with the kmeans clusters.
// 4. The image that is the output of the 05lt_Optimum_Imager.js script. This should be an array image with all the breakpoints (vertices) (up to the maxSegments specified).
// 5. Image stack that you want to apply the breakpoints to (fit). This script was written with SERVIR composites in mind. 
// 6. Start year, this should be the first year in your image stack 
// 7. LTOP band - this is kind of clunky but you just need to define a band name that is in line with the naming convention of the breakpoints image but does not 
//    exist in that image. This could be automated as well. 

////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
Map.centerObject(geometry4,16)
//inputs and user specified args (NOTE: change the geometry we're clipping to, currently just set up as a test)
var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA','Laos')).geometry().buffer(5000);
//kmeans cluster image
var cluster_image = ee.Image("users/ak_glaciers/LTOP_Laos_Kmeans_Cluster_Image"); 
//selected LT params
var table = ee.FeatureCollection("users/ak_glaciers/LTOP_Laos_config_selected");
//vertices image from LTOP
var lt_vert = ee.Image("users/clarype/Optimized_LandTrendr_year_vert_array_ben").clip(geometry3);
//image stack
var servir_ic = ee.ImageCollection('projects/servir-mekong/regionalComposites').filterBounds(geometry3).select('swir1'); 
//it seems like there is an issue with the dates starting on January 1. This is likely the result of a time zone difference between where 
//the composites were generated and what the LandTrendr fit algorithm expects from the timestamps. 
servir_ic = servir_ic.map(function(img){
  var date = img.get('system:time_start'); 
  return img.set('system:time_start',ee.Date(date).advance(6,'month').millis()); 
}); 
//this should be 2000 for the servir composites, test or change for another year if using a different collection 
//get the start year automatically from the first composite
var startYear = ee.Number.parse(servir_ic.first().get('system:index')).getInfo(); 
print('the start year is: ',startYear)
var endYear = 2020; 
var LTOP_band = 'yrs_vert_0'; 
var min_obvs = ee.Number(lt_vert.bandNames().length()).getInfo(); 

////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
//get the servir ic
// Map.addLayer(lt_vert,{},'original data')
// Map.addLayer(servir_ic,{},'servir')
//do a little test to see what happens when we have an input array and image collection that are quite different sizes
// servir_ic = servir_ic.filter(ee.Filter.inList('system:index',['2003','2004','2005','2006','2007','2008','2009','2010','2011','2012','2013','2014','2015','2016','2017','2018','2019','2020'])); 
// print(servir_ic, 'after filtering')

//next we need to set up a thing that gets the bp years between two end point years. In the case that there is no bp in the start year
//we need to set that as a breakpoint so the time series is bookended when we do the fit 

//create an image of constant value with starting year val. This will be used to ensure we have the starting bp
var yearImg = ee.Image.constant(startYear).select(['constant'],[LTOP_band])

//get the array of breakpoints from the LTOP outputs 
var breakpoints = lt_vert.toArray()
// breakpoints = breakpoints.arraySlice(0,1)

//create a mask that gets rid of everything before the start year plus one. We add one to make sure that when we add the start 
//year back in we don't get the start year twice (duplicate breakpoints)
var mask = lt_vert.gte(startYear+1).toArray()

//apply the mask to the array 
breakpoints = breakpoints.arrayMask(mask); 
// Map.addLayer(breakpoints,{},'mask bps')
//add the constant image above as an array with the start year as the constant value
breakpoints = breakpoints.arrayCat({
  image2:yearImg.toArray(),
  axis:0
}); 

//sort the array values so that the breakpoint years are in chronological order after adding a band
breakpoints = breakpoints.arraySort(); 
print(breakpoints,'breakpoints'); 
Map.addLayer(breakpoints,{},'breakpoints',0); 

//breakpoints should now be ready to use as input to the LandTrendr fit algorithm 
///////////////////////////////////////////////////////////////////////////////////////////////////////
// here we need to insert the deal with the spikeThreshold masks. I think this will mean running the LT-fit algo three (or however many)
// times there are distinct spikeThreshold values and then patching those images back together at the end. 

var spike_vals = table.aggregate_array('spikeThreshold').distinct(); 
//go through the distinct spikeThreshold vals, filter or mask the image 
//to get each value and use that as a mask to get the areas of the constant image that we want 

var filter_pixels = spike_vals.map(function(x){
  //the output of this function is a list of masks, each mask has the value of the spikeThreshold for the clusters that should be 
  //run with that value in those places
  //first we have to get any pixels that have a cluster id with the spikeThreshold value we're looking for 
  var clusters = table.filter(ee.Filter.eq('spikeThreshold',x)); 
  //then we get a list of all the cluster_ids with that spike threshold value
  clusters = clusters.aggregate_array('cluster_id'); 
  //next we get all the pixels from the cluster image that match the cluster ids selected in the previous step (create a mask)
  var mask = cluster_image.remap(clusters,ee.List.repeat(1,clusters.length())); 
  //add a prop with the spikeThreshold value so we can query it later
  return mask.set('spikeThreshold',x); 
}); 

//these are the masks we want for running LandTrendr fit 
var spike_masks = ee.ImageCollection.fromImages(filter_pixels); 
var masked_ic = spike_masks.map(function(msk){
  //map over the ic, masking each image in the collection as we go
  var ic = servir_ic.map(function(img){
    return img.updateMask(msk); 
  }); 
  //run LandTrendr
  var lt_servir = ee.Algorithms.TemporalSegmentation.LandTrendrFit({
    timeSeries:ic,
    vertices:breakpoints,
    spikeThreshold:msk.get('spikeThreshold'),
    minObservationsNeeded:11
    });
  return lt_servir; 
}); 

var combined = masked_ic.mosaic(); 

//Map.addLayer(combined,{},'combined'); 

///////////////////////////////////////////////////////////////////////////////////////////////////////
//implement a version of the disturbance detection that does not use the pre-cooked disturbance code from LT. 
//we are writing a different version because the outputs of the LTOP process do not include the depth of information
//that is available from running the richer LT full algorithm. 

//select one band to test the outputs of the LT fit step 
var ftv = combined.select(['swir1_fit']); 
// Map.addLayer(ftv,{},'ftv only')

var forwardDifference = function(array) {
  var left = array.arraySlice(0, 0, -1); 
  var right = array.arraySlice(0, 1); 
  //double check order
  return left.subtract(right); 
}; 

var backwardsDifference = function(array) {
  var right = array.arraySlice(0, 0, -1); 
  var left = array.arraySlice(0, 1); 
  //double check order
  return left.subtract(right); 
}; 


//these are the delta outputs but they can only have a duration of one year
var deltas = backwardsDifference(ftv); 

Map.addLayer(deltas,{},'deltas'); 
//////////////
//this is kind of experimental 
//unclear from here how we want to keep track of the years (i.e. actual year or the distance from the previous segment vertex, or both?)
//make a list of years 
var years_lst = ee.List.sequence(startYear+1,endYear);
var years_img = years_lst.map(function(year){
  return ee.Image.constant(year);
}); 
// //convert the list of constant year images to an ic then to a multiband image then to an array 
years_img = ee.ImageCollection.fromImages(years_img).toBands().toArray(); 
// print(years_img)
// Map.addLayer(years_img,{},'years img')
var deltas_2d = years_img.arrayCat(deltas,1); 
Map.addLayer(deltas_2d,{},'deltas 2d'); 
// //make shifted breakpoints which should be the length of the segments? 
// ///////////////////
// //This is to replicate either durations, breakpoint years or deltas 
var duration = backwardsDifference(breakpoints); 

var bands = ['t1','t2','t3','t4','t5','t6','t7','t8','t9','t10']; 
Map.addLayer(duration.arrayGet(0),{},'small duration')
var dur_img = duration.arrayGet(0) //get just the first item
                      .arrayProject([0])
                      .arrayFlatten([[bands[0]]]); 

var dur_2d = breakpoints.arraySlice(0,1).arrayCat(duration,1)//.arrayRepeat(0,duration.arrayGet(0)); 





// Map.addLayer(dur_img,{},'dur image')
Map.addLayer(duration,{},'duration'); 
Map.addLayer(dur_2d,{},'2d breakpoints')
// Map.addLayer(segLengths,{},'shifted breakpoints')
//////////////
//this section is a bit clunky and should probably be written off of a 2D array instead...
//make shifted delta outputs. Taking these differences should give the location of the breakpoints? 
var yod = forwardDifference(deltas)//year of detection
var ones = ee.Image(ee.Array([1])); 
//prepend a one - when we take deltas of deltas to get the years it changed everything to shift by a year. 
//we also lose the first and last breakpoint years because no changes occurred in those years. We need to those to 
//calculate the magnitude of change for each segment so we need to add ones for those so that they are selected from the 
//raw data when segment magnitude changes are calculated. 
yod = (ones.addBands(yod).toArray(0)).toInt() //cast to int because there's a weird floating pt thing going on 
//add a 1 at the end- because this was based on the deltas we lost the last item in the array but we want it for the mask
yod = yod.addBands(ones).toArray(0)

//now make a mask
var yrMask = yod.neq(0)
Map.addLayer(yrMask,{},'mask')

// //get the start years for each segment 
// var masked_years = years_img.multiply(yrMask); 
// Map.addLayer(masked_years,{},'masked_years')
// //get the start values for each segment
// var startVals = ftv.arrayMask(yrMask);
// //get the backwards difference- this will be the magnitude of change between two breakpoints 
// var segChange = backwardsDifference(startVals)
// //calculate the max change- this is the largest change between two vertices over the time series 
// var maxChange = segChange.arrayReduce(ee.Reducer.max(),[0])

// //get the index in the array of the end point year when a shift occurred and convert it to an image with a scaler band 
// var pos_of_max = segChange.arrayArgmax()
//                           .arrayProject([0])
//                           .arrayFlatten([['max']])
//get the breakpoint years, dropping the first which is always the start year                          
var changeYrs = breakpoints.arraySlice(0,1) 
//add in the duration information so we can add that as a band as well
// var max_dur = duration.arrayGet(pos_of_max).select(['array'],['dur']); 
// print(max_dur,'max dur')
// //get just the end year of the segment that showed the greatest change in the time series 
// var max_yod = changeYrs.arrayGet(pos_of_max); 
///////////////////////////////////////////////////////////////////////////////////////
// var dur_yrs = duration.arrayCat(breakpoints.arraySlice(0,1),1); 

// Map.addLayer(dur_yrs,{},'dur years')


// //make a multiband image that has the 
// var bands = ['t1','t2','t3','t4','t5','t6','t7','t8','t9','t10']; 
// var dur_img = duration.arrayPad([10]) //pad so that the arrays are the same size
//                       .arrayProject([0])
//                       .arrayFlatten([bands]); 
//get the number of segments 
// var numSegments = duration.arrayLength(0).arrayReduce(ee.Reducer.max(),0); 
// var numSegments = ee.List.sequence(0,10)
// var make_yr_arrays = bands.map(function(b){
//   //get a band of the duration made into an image
//   var img = dur_img.select([b]); 
//   //go through the actual values of the duration array and repeat them- this will make a list of array images 
//   //these can then be concatenated or otherwise smooshed together afterwards? 
//   var imgs = numSegments.map(function(x){
//     //get a position in the duration array
//     var arr = duration.arrayGet(ee.Image.constant(x).toInt())
//     //do the duplication so that each pixel gets the right number of duplicates 
//     var duplicated = arr.arrayRepeat(1,img)
//   return duplicated
//   }); 
//   return imgs.flatten()
// }); 
// print(make_yr_arrays[0][0],'arrays')
// Map.addLayer(ee.Image(make_yr_arrays[0][0]),{},'image array test')
// var ic_test = ee.ImageCollection.fromImages(make_yr_arrays)
// print(ic_test)
//try taking the breakpoints without the first year (this one won't be a label for a segment) 
//and then try repeating based on the duration array
//var test_dur = breakpoints.arraySlice(0,1).arrayRepeat(1,dur_img); 


