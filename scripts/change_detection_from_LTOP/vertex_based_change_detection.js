// #####################################################################################
// ########## Script to implement annual change detection processing
// #####################################################################################

//get the data inputs 
// date: 2022-02-03
// author: Ben Roberts-Pierel | robertsb@oregonstate.edu
//         Peter Clary        | clarype@oregonstate.edu
//         Robert Kennedy     | rkennedy@coas.oregonstate.edu
// website: https://github.com/eMapR/LT-GEE

//  This program takes eleven inputs:
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

//USER DEFINED INPUTS/PARAMS
//inputs and user specified args (NOTE: change the geometry we're clipping to, currently just set up as a test)
var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA','Cambodia')).geometry().buffer(5000);
// //image stack
// var servir_ic = ee.ImageCollection('projects/servir-mekong/regionalComposites').filterBounds(geometry2); 
//kmeans cluster image
var cluster_image = ee.Image("users/ak_glaciers/ltop_snic_seed_points75k_kmeans_cambodia_c2_1990"); 
//selected LT params
var table = ee.FeatureCollection("users/ak_glaciers/LTOP_Cambodia_config_selected_220_kmeans_pts_new_weights");
//vertices image from LTOP
var lt_vert = ee.Image("users/ak_glaciers/Optimized_LT_1990_start_Cambodia_remapped_cluster_ids").clip(aoi);
Map.addLayer(lt_vert,{},'lt vert'); 
//import modules
var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 
var ftv_prep = require('users/emaprlab/broberts:LTOP_mekong/06lt_Transfer_FTV_modules.js'); 

var startYear = 1990; 
var endYear = 2021; 
var place = 'Cambodia'; 
var min_obvs = 11;  
var export_band = 'NBR_fit'; 
var comps_source = 'servir'

////////////////////////////////////////////////////////////////////////////////////////////////////
//now prep the imageCollection and the LT breakpoints from the LTOP process

//first the composites 
var yr_images = []; 
for (var y = 1990;y < 2022; y++){
  var im = ee.Image("projects/servir-mekong/composites/" + y.toString()); 
  yr_images.push(im); 
}

//create a servir composites ic
var servir_ic = ee.ImageCollection.fromImages(yr_images).filterBounds(aoi); 

//make a couple of changes to the servir composites to make them easier to use below 

//it seems like there is an issue with the dates starting on January 1. This is likely the result of a time zone difference between where 
//the composites were generated and what the LandTrendr fit algorithm expects from the timestamps. 
servir_ic = servir_ic.map(function(img){
  var date = img.get('system:time_start'); 
  return img.set('system:time_start',ee.Date(date).advance(6,'month').millis()); 
}); 

//rename the first seven bands to match the expectations for LandTrendr.js to calculate indices. NOTE that this gets rid of the other bands which are the quartiles and thermal 
servir_ic = servir_ic.select(['blue','green','red','nir','swir1','swir2'],['B1','B2','B3','B4','B5','B7']); 

//the servir composites just have Landsat like bands. We want to be able to calculate indices also so add those before we apply the LandTrendr fit algorithm
//a 1 flips the index and a 0 does not
servir_ic = servir_ic.map(function(img){
var b5   = ltgee.calcIndex(img, 'B5', 1);
var b7   = ltgee.calcIndex(img, 'B7', 0);
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

//next the breakpoints, these are from the LTOP process
var breakpoints = ftv_prep.prepBreakpoints(lt_vert); 

///////////////////////////////////////////////////////////////////////////////////////////////////////
//now do the actual LandTrendr work
//run lt fit 
var lt_fit_output = ftv_prep.runLTfit(table,servir_ic,breakpoints,cluster_image,min_obvs); 
var lt_output = ftv_prep.convertLTfitToLTprem(lt_fit_output,export_band,startYear,endYear); 

var years = lt_output.select('LandTrendr').arraySlice(0, 0, 1).arrayProject([1]);
var mask = lt_output.select('LandTrendr').arraySlice(0, 3).arrayProject([1]);

var example = years.arrayMask(mask); 
Map.addLayer(example,{},'example')
///////////////////////////////////////////////////////////////////////////////////////////////////////
//now we want to calculate the time since the last vertex and the length of a segment
//first we make an array image that has the year of the segment that year belongs to
//note that this assumes the input is not missing any years and is based on some code from Yang that infills missing years
 
function backwardsDifference(array) {
  var right = array.arraySlice(0, 0, -1); 
  var left = array.arraySlice(0, 1); 
  return left.subtract(right); 
}

function fillSegmentYear(ltResult, startYear, endYear, fillYears) {
  var array = ltResult.select('LandTrendr');
  var allYears = ee.List.sequence(startYear, endYear);
  
  //extract year, ftv, and vertex
  var years = array.arraySlice(0, 0, 1).arrayProject([1]);
  var mask = array.arraySlice(0, 3).arrayProject([1]);

  // Mask off the non-breakpoint values.
  var mYears = years.arrayMask(mask); //this will look like LTOP output, array of vertex yrs of variable length
  //make a selection for the segment length
  var segmentLengths = backwardsDifference(mYears); 
  // Some constants per pixel.
  var lastYear = mYears.arrayGet([-1]); //this should always be the last year in the time series
  var size = mYears.arrayLength(0); //this will be variable with the number of vertex years 

  var result = allYears.map(function(year) {
    year = ee.Image.constant(year); 
    // Find which segement this year belongs to.
    var index = mYears.gt(year).arrayArgmax().arrayGet([0]); 
    
    // Clamp values beyond the last year to the last segment.
    index = index.where(lastYear.lte(year), size.subtract(1)); 
    //now just use the index that's calculated to segment mYears and get the segment year 
    var out = ee.Algorithms.If(fillYears,
    segmentLengths.arrayGet(index.subtract(1)),
    mYears.arrayGet(index.subtract(1))
    ); 
    
    return ee.Image(out); 
  }); 
  
  return ee.ImageCollection(result).toArrayPerBand(0); 
  
}

var bandNames = ee.List.sequence(startYear,endYear); 
bandNames = bandNames.map(function(bn){
  //create a band name that doesn't start with a number
  return ee.String('yr_').cat(ee.Number(bn).toInt().format())
}); 

//passing 'fill' or another string to the fillSegmentYear function will output segment lengths
//passing an empty list will yield the year of the closest segment 
var segmentLength = fillSegmentYear(lt_output, 1990, 2021,'fill'); 
Map.addLayer(segmentLength,{},'segment length'); 

Export.image.toAsset({
  image:segmentLength.arrayFlatten([bandNames]).toInt16(), 
  description:'LTOP_annual_segment_length_Cambodia', 
  assetId:'reem_cf_outputs/LTOP_annual_segment_length_Cambodia', 
  region:aoi, 
  scale:30, 
  maxPixels:1e13
  
})
//////////////////////////////////////////////////////////////////////////////////////
//now we want to calculate the time since the last vertex - this is currently set as more of a time to 
//this could be changed but we'd need to change so that the value is based on the segment start instead of segment end 
var timeTo = years.subtract(fillSegmentYear(lt_output, 1990, 2021,[])); 
Map.addLayer(timeTo,{},'time since')

var timeToImg = timeTo.arrayFlatten([bandNames])
timeToImg = timeToImg.toInt16()
// print(timeToImg,'time to imaage')
// Map.addLayer(timeToImg.select('2010'),{},'time to image')
Export.image.toAsset({
  image:timeToImg, 
  description:'LTOP_annual_time_since_vertex_Cambodia', 
  assetId:'reem_cf_outputs/LTOP_annual_time_since_vertex_Cambodia', 
  region:aoi, 
  scale:30, 
  maxPixels:1e13
  
})
