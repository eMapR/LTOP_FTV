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
// 1.  An aoi of your study area
// 2.  The cluster image from the Kmeans process. This was an input for the 05lt_Optimum_Imager.js script 
// 3.  The selected LandTrendr params from the LTOP process that was also used in the 05lt_Optimum_Imager.js script. This should line up with the kmeans clusters.
// 4.  The image that is the output of the 05lt_Optimum_Imager.js script. This should be an array image with all the breakpoints (vertices) (up to the maxSegments specified).
// 5.  Image stack that you want to apply the breakpoints to (fit). This script was written with SERVIR composites in mind. 
// 6.  Modules from LandTrendr.js public script
// 7.  Start year, this should be the first year in your image stack 
// 8.  End year, this should be the last year in your image stack 
// 9.  LTOP band - this is kind of clunky but you just need to define a band name that is in line with the naming convention of the breakpoints image but does not 
//     exist in that image. This could be automated as well. 
// 10. Min obvs for the LandTrendr fit algorithm. This needs to be less than the number of images in the stack 
// 11. export band, this is the band (or index) from the SERVIR composites that you want to manipulate and export at the end of the script. Available bands are still in 
//     flux as of 2/18/2022 but they can be viewed in the second section below. 
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
Map.centerObject(geometry4,14)
//USER DEFINED INPUTS/PARAMS
//inputs and user specified args (NOTE: change the geometry we're clipping to, currently just set up as a test)
var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA','Laos')).geometry().buffer(5000);
//kmeans cluster image
var cluster_image = ee.Image("users/ak_glaciers/LTOP_Laos_Kmeans_Cluster_Image"); 
//selected LT params
var table = ee.FeatureCollection("users/ak_glaciers/LTOP_Laos_config_selected");
//vertices image from LTOP
var lt_vert = ee.Image("users/clarype/Optimized_LandTrendr_year_vert_array_ben").clip(geometry3);
//image stack
var servir_ic = ee.ImageCollection('projects/servir-mekong/regionalComposites').filterBounds(geometry3); 
//import the LandTrendr modules
var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 

var startYear = 2000; 
var endYear = 2020; 
var LTOP_band = 'yrs_vert_0'; 
var min_obvs = 11;  
var export_band = 'NBR_fit'; 

///////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////
//make a couple of changes to the servir composites to make them easier to use below 

//it seems like there is an issue with the dates starting on January 1. This is likely the result of a time zone difference between where 
//the composites were generated and what the LandTrendr fit algorithm expects from the timestamps. 
servir_ic = servir_ic.map(function(img){
  var date = img.get('system:time_start'); 
  return img.set('system:time_start',ee.Date(date).advance(6,'month').millis()); 
}); 
Map.addLayer(servir_ic.first(),{},'before changing anything')
print(servir_ic.first(),'before')
//rename the first seven bands to match the expectations for LandTrendr.js to calculate indices. NOTE that this gets rid of the other bands which are the quartiles and thermal 
servir_ic = servir_ic.select(['blue','green','red','nir','swir1','swir2'],['B1','B2','B3','B4','B5','B7']); 
print(servir_ic.first(),'servir')

///////////////////////////////////////////////////////////////////////////////////////////////////////
//the servir composites just have Landsat like bands. We want to be able to calculate indices also so add those before we apply the LandTrendr fit algorithm
servir_ic = servir_ic.map(function(img){
var b5   = ltgee.calcIndex(img, 'B5', 1);
var b7   = ltgee.calcIndex(img, 'B7', 1);
var tcw  = ltgee.calcIndex(img, 'TCW', 1);
var tca  = ltgee.calcIndex(img, 'TCA', 1);
var ndmi = ltgee.calcIndex(img, 'NDMI', 0);
var nbr  = ltgee.calcIndex(img, 'NBR', 0);
var ndvi = ltgee.calcIndex(img, 'NDVI', 0);
return b5.addBands(b7)
         .addBands(tcw)
         .addBands(tca)
         .addBands(ndmi)
         .addBands(nbr)
         .addBands(ndvi)
         .set('system:time_start', img.get('system:time_start'));

}); 

print(servir_ic.first(),'with indices'); 
Map.addLayer(servir_ic.first(),{},'with bands'); 
///////////////////////////////////////////////////////////////////////////////////////////////////////
//prepare the breakpoints for use in the LandTrendr fit algorithm
//get the bp years between two end point years. In the case that there is no bp in the start year we need to set that as a breakpoint 
//so the time series is bookended when we do the fit 

//create an image of constant value with starting year val. This will be used to ensure we have the starting bp
var yearImg = ee.Image.constant(startYear).select(['constant'],[LTOP_band]); 

//get the array of breakpoints from the LTOP outputs 
var breakpoints = lt_vert.toArray(); 

//create a mask that gets rid of everything before the start year plus one. We add one to make sure that when we add the start 
//year back in we don't get the start year twice (duplicate breakpoints)
var mask = lt_vert.gte(startYear+1).toArray(); 

//apply the mask to the array 
breakpoints = breakpoints.arrayMask(mask); 
//add the constant image above as an array with the start year as the constant value
breakpoints = breakpoints.arrayCat({
  image2:yearImg.toArray(),
  axis:0
}); 

//sort the array values so that the breakpoint years are in chronological order after adding a band
breakpoints = breakpoints.arraySort(); 
Map.addLayer(breakpoints,{},'breakpoints',0); 

//breakpoints should now be ready to use as input to the LandTrendr fit algorithm 
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Insert a process that selects different spikeThreshold params for LT based on the different K-means clusters from the optimization process. This is a masking process
//whereby each of the options for spikeThreshold are selected and used as a mask to run different paramaterizations of LT-fit and then those are patched backtogether at the end.

//first get all the possible spikeThreshold values 
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

//run LandTrendr
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
    minObservationsNeeded:min_obvs
    });
  return lt_servir; 
}); 

//combine the masked versions of LT into an image
var combined = masked_ic.mosaic(); 
print(combined,'LandTrendr fit output'); 

///////////////////////////////////////////////////////////////////////////////////////////////////////
//convert the outputs of LT fit to look like the outputs of LT premium. This is a 2D array that has four rows 
//(year list,source value, fitted value and a boolean isVertex row) and as many columns as there are observation years. 

//select one band to test the outputs of the LT fit step. This has each year as a band. 
var ftv = combined.select([export_band]); 

//make a list of years then images to fill the first row of the array
var years = ee.List.sequence(startYear,endYear,1);
//define a function that makes a list of constant images 
var mk_duplicate_imgs = function(x){
  return ee.Image.constant(x); 
}; 
var yrs_img = years.map(mk_duplicate_imgs); 
//create an array image of years
yrs_img = ee.ImageCollection.fromImages(yrs_img).toBands().toArray(); 

//now create the source values- we don't have these so fill with a noData value 
var source_vals = ee.Image.constant(-9999).toArray();
source_vals = source_vals.arrayRepeat(0,years.length()); 

//next we create the isVertex row of the table. This has a one if the year is a breakpoint and 0 if not
//there's probably a cleaner way to do this part 
var backwardsDifference = function(array) {
  var right = array.arraySlice(0, 0, -1); 
  var left = array.arraySlice(0, 1); 
  return left.subtract(right); 
}; 

var forwardDifference = function(array) {
  var left = array.arraySlice(0, 0, -1); 
  var right = array.arraySlice(0, 1); 
  return left.subtract(right); 
}; 

//these are the delta outputs but they can only have a duration of one year
var deltas = backwardsDifference(ftv); 

//make shifted delta outputs. Taking these differences should give the location of the breakpoints? 
var yod = forwardDifference(deltas); //year of detection
var ones = ee.Image(ee.Array([1])); 
//prepend a one - when we take deltas of deltas to get the years it changed everything to shift by a year. 
//we also lose the first and last breakpoint years because no changes occurred in those years. We need to those to 
//calculate the magnitude of change for each segment so we need to add ones for those so that they are selected from the 
//raw data when segment magnitude changes are calculated. 
yod = (ones.addBands(yod).toArray(0)).toInt(); //cast to int because there's a weird floating pt thing going on 
//add a 1 at the end- because this was based on the deltas we lost the last item in the array but we want it for the mask
yod = yod.addBands(ones).toArray(0); 
//now make a mask
var isVertex = yod.neq(0);

//now put all the pieces together 
//first concat the first two rows together 
var arr1 = yrs_img.arrayCat(source_vals,1); 
//then combine the second two rows 
var arr2 = ftv.toArray().arrayCat(isVertex,1);
//then combine the 2 2D arrays- it seems like arrayCat won't let you combine a 2d array with a 1d array 
//also rename the default array band to match the outputs of premium Landtrendr for the disturbance mapping 
var lt_out = arr1.arrayCat(arr2,1).arrayTranspose(); 
lt_out = lt_out.addBands(ee.Image.constant(1)).select(['array','constant'],['LandTrendr','rmse']); 

Map.addLayer(lt_out,{},'LandTrendr-like output'); 

///////////////////////////////////////////////////////////////////////////////////////////////////////
//export some outputs- this will export an asset that looks like regular landtrendr output (LandTrendr and RMSE bands) for whatever area you are using above 
Export.image.toAsset({
  image:lt_out, 
  description:export_band+'_LandTrendr_like_output', 
  assetId:export_band+'_LandTrendr_like_output', 
  region:geometry3, //this will be aoi 
  scale:30
}); 