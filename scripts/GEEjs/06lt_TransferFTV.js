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
//inputs and user specified args (NOTE: change the geometry we're clipping to, currently just set up as a test)
var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA','Laos')).geometry().buffer(5000);
//kmeans cluster image
var cluster_image = ee.Image("users/ak_glaciers/LTOP_Laos_Kmeans_Cluster_Image"); 
//selected LT params
var table = ee.FeatureCollection("users/ak_glaciers/LTOP_Laos_config_selected");
//vertices image from LTOP
var lt_vert = ee.Image("users/clarype/Optimized_LandTrendr_year_vert_array_ben").clip(geometry3);
//image stack
var servir_ic = ee.ImageCollection('projects/servir-mekong/regionalComposites').filterBounds(geometry3).select('swir1')
//it seems like there is an issue with the dates starting on January 1. This is likely the result of a time zone difference between where 
//the composites were generated and what the LandTrendr fit algorithm expects from the timestamps. 
servir_ic = servir_ic.map(function(img){
  var date = img.get('system:time_start')
  return img.set('system:time_start',ee.Date(date).advance(6,'month').millis())
}); 
//this should be 2000 for the servir composites, test or change for another year if using a different collection 
//get the start year automatically from the first composite
var startYear = ee.Number.parse(servir_ic.first().get('system:index')).getInfo()
var LTOP_band = 'yrs_vert_0'
var min_obvs = ee.Number(lt_vert.bandNames().length()).getInfo()

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
Map.addLayer(breakpoints,{},'mask bps')
//add the constant image above as an array with the start year as the constant value
breakpoints = breakpoints.arrayCat({
  image2:yearImg.toArray(),
  axis:0
}); 

//sort the array values so that the breakpoint years are in chronological order after adding a band
breakpoints = breakpoints.arraySort(); 
print(breakpoints,'breakpoints')
Map.addLayer(breakpoints,{},'breakpoints')

//breakpoints should now be ready to use as input to the LandTrendr fit algorithm 
///////////////////////////////////////////////////////////////////////////////////////////////////////
// here we need to insert the deal with the spikeThreshold masks. I think this will mean running the LT-fit algo three (or however many)
// times there are distinct spikeThreshold values and then patching those images back together at the end. 

var spike_vals = table.aggregate_array('spikeThreshold').distinct()
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
  var mask = cluster_image.remap(clusters,ee.List.repeat(1,clusters.length()))
  //add a prop with the spikeThreshold value so we can query it later
  return mask.set('spikeThreshold',x)
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

Map.addLayer(combined,{},'combined'); 

///////////////////////////////////////////////////////////////////////////////////////////////////////
//implement a version of the disturbance detection that does not use the pre-cooked disturbance code from LT. 
//we are writing a different version because the outputs of the LTOP process do not include the depth of information
//that is available from running the richer LT full algorithm. 

//select one band to test the outputs of the LT fit step 
var ftv = combined.select(['swir1_fit']); 
// Map.addLayer(ftv,{},'ftv only')

var backwardsDifference = function(array) {
  var left = array.arraySlice(0, 0, -1); 
  var right = array.arraySlice(0, 1); 
  //double check order
  return left.subtract(right); 
}; 

//these are the delta outputs but they can only have a duration of one year
var difference = backwardsDifference(ftv); 

Map.addLayer(difference,{},'diff'); 

//now add something that can understand duration- this is the time since the last breakpoint? 


///////////////////////////////////////////////////////////////////////////////////////////////////////
// check what the outputs look like
///////////////////////////////////////////////////////////////////////////////////////////////////////
//run LandTrendr without extra spike threshold stuff
// var lt_servir = ee.Algorithms.TemporalSegmentation.LandTrendrFit(servir_ic,breakpoints,0.9,6)
// // print(lt_servir,'servir')

//do a little test of the shifting
// var base = ee.Array([5,3,2,1])
// var right = base.slice(0,0,-1)
// var left = base.slice(0,1)
// var diff = left.subtract(right)
// print(left)
// print(right)
// print(diff)
//check the outputs for a set location 
var pt_location = ftv.reduceRegion({
  reducer:ee.Reducer.first(), 
  geometry:geometry4, 
  scale:30
})

var pt_bps = breakpoints.reduceRegion({
  reducer:ee.Reducer.first(), 
  geometry:geometry4, 
  scale:30
})

// var pt_location = servir_ic.reduceRegion({
//   reducer:ee.Reducer.first(), 
//   geometry:geometry4, 
//   scale:30
// })

// print()
print(pt_bps,'bps')
print(pt_location,'ftv')
///////////////////////////////////////////////////////////////////////////////////////////////////////
//visualize the outputs

//use this to convert the array image back to a regular image where each band is a fitted year. 
// var years = [];                                                           // make an empty array to hold year band names
// for (var i = startYear; i <= 2020; ++i) years.push('yr'+i.toString());    // fill the array with years from the startYear to the endYear and convert them to string
// var testftvStack = ftv.arrayFlatten([years]);                             // flatten this out into bands, assigning the year as the band name

// //print and visualize the fitted outputs
// print(testftvStack,'example'); 
// Map.addLayer(testftvStack,{min:100,max:4000},'servir example fit'); 
// Map.addLayer(test,{},'shifted'); 

///////////////////////////////////////////////////////////////////////////////////////////////////////



