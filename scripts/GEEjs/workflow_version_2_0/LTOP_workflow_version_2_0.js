//######################################################################################################## 
//#                                                                                                    #\\
//#                                         LandTrendr Optimization workflow                           #\\
//#                                                                                                    #\\
//########################################################################################################

// date: 2020-12-10
// author: Peter Clary        | clarype@oregonstate.edu
//         Robert Kennedy     | rkennedy@coas.oregonstate.edu
//         Ben Roberts-Pierel | robertsb@oregonstate.edu
// website: https://github.com/eMapR/LT-GEE

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Import modules /////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 
var ltop = require('users/emaprlab/broberts:LTOP_mekong/LTOP_modules')

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Time, space and masking params /////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
//these date windows are specific to the place that you're working on
var startDate = '11-20'; 
var endDate =   '03-10'; 
var masked = ['cloud', 'shadow']; //powermask?? in new and has magic powers ... RETURN TO THIS AND ADD MORE DETAIL
var str_start = '1990'; 
var place = 'Cambodia'; 
var num_rand_feats = 75000; 
var startYear = 1990; 
var endYear = 2021; 
var abstractImagesPath = 'users/ak_glaciers/paraguay_abstract_images/revised_abstract_image_'; 

var table = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA',place)); 
// var aoi = table.geometry().buffer(5000);
var aoi = geometry
/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Landsat Composites /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
//these composites will be used for the SNIC and kMeans processes. We need to experiement with making them multi-year composites instead of just annual 
var image2021 = ltgee.buildSRcollection(2021, 2021, startDate, endDate, aoi, masked).mosaic()
var image2005 = ltgee.buildSRcollection(2005, 2005, startDate, endDate, aoi, masked).mosaic()
var image1990 = ltgee.buildSRcollection(1990, 1990, startDate, endDate, aoi, masked).mosaic()

var LandsatComposites = image2021.addBands(image2005).addBands(image1990)

//these composites are used for the last two steps and span the full period
var annualSRcollection = ltgee.buildSRcollection(startYear, endYear, startDate, endDate, aoi, masked); 

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Call the functions /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
//NOTE that ideally you don't have to go below here to change much, you should be able to call pretty much everything from here 
// 1. run the snic algorithm 
var snic_output01 = snic01(LandsatComposites); 

// 2. cluster the snic patches with kmeans 
var kmeans_output02 = kmeans02(snic_output01.get(0),snic_output01.get(1)); //here 0 is the pts and 1 is the imagery (not seed imagery)

// 3. create some abstract images - NOTE this is split into two because there is a process that still has to take place in Python 
// var abstract_output03_1 = abstractSampler03_1(annualSRcollection,kmeans_output02); 
//you can run everything to here in one go
// var abstract_output03_2 = abstractSampler03_2(abstractImagesPath); 

// // 4. get Landsat values for the points in the abstract images 
// var abstract_output04 = abstractImager04(abstract_output03_2); 

// // 5. create the optimized output
// var optimized_output05 = optimizedImager05(table,annualSRcollection,kmeans_output02[1]); //note that table is the selected paramaters from the python script after step four

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////// The following functions are the condensed versions of previous scripts  ////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// 01 SNIC ////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
function snic01 (snic_composites){
//run the SNIC algorithm 
// var SNICoutput = ee.Image('users/ak_glaciers/Cambodia_LTOP_assets/LTOP_snic_imagery_Cambodia_c2_w_project1990')

var SNICoutput = ltop.runSNIC(snic_composites,aoi); 
var SNICpixels = ltop.SNICmeansImg(SNICoutput,aoi); 

//these were previously the two things that were exported to drive 
var SNICimagery = SNICoutput.toInt32()//.reproject({  crs: 'EPSG:4326',  scale: 30}); //previously snicImagery
var SNICmeansImg = SNICpixels.toInt32().clip(aoi); //previously SNIC_means_image

//now do the steps that were being done in QGIS
//first convert pixels to points, setting non-centroids to no data 
//next randomly subset (this defaults to 75k in existing workflow)
//then sample from the SNIC imagery to get seed values for each point 
//check what the grid looks like: 
var grid = aoi.coveringGrid('EPSG:4326', 20000).filterBounds(aoi);
var grid_list = grid.toList(grid.size())
grid_list = grid_list.slice(0,20)
var small_grid = ee.FeatureCollection(grid_list)
print(grid_list)

print(grid)
Map.addLayer(grid,{},'grid')
// print(outputs)
var snicPts = ltop.splitPixImg(SNICmeansImg.select('clusters'),grid,10000)

//do the sampling -try without the sampling to see if the problem is isolated
snicPts = ltop.samplePts(snicPts,SNICimagery); 
// print(snicPts)
// Map.addLayer(snicPts,{},'snic pts sampled')
// Export.table.toAsset({
//               collection: snicPts, 
//               description:"LTOP_snic_pts_"+place+"_c2_two_w_buffer_20000_full_grid_"+str_start, 
//               assetId:"LTOP_snic_pts_"+place+"_c2_two_w_buffer_20000_full_grid_"+str_start, 
              
//   }); 
  
// Export.image.toAsset({
//               image: SNICimagery, 
//               description:"LTOP_snic_imagery_"+place+"_c2_w_project"+str_start, 
//               assetId:"users/ak_glaciers/"+place+"_LTOP_assets/LTOP_snic_imagery_"+place+"_c2_w_project"+str_start, 
//               region:aoi, 
//               scale:30,
//               maxPixels:1e13, 
//   }); 

return ee.List([snicPts,SNICimagery]); 
// return null
  
}

//create a new folder to hold these things
// var test = ee.data.createFolder('users/ak_glaciers/test_folder')	
// var snicPts = ltop.splitPixImg(SNICmeansImg,aoi,grid,num_rand_feats); 
// var snicPts = ltop.pixelsToPts(SNICmeansImg.select('clusters'),grid.first())
// var outputs = []
// for(var i = 0; i<20; i++){
//   var feat = ee.Feature(grid_list.get(i))
//   var snicPts = ltop.splitPixImg(SNICmeansImg.select('clusters'),feat,10) //this last arg isn't being used 
//   Export.table.toAsset({
//               collection: snicPts, 
//               description:"LTOP_snic_pts_"+place+"_c2_two_w_buffer_20_gridcells_"+str_start+'_'+i.toString(), 
//               assetId:"ben/ltop_testing/LTOP_snic_pts_"+place+"_c2_two_w_buffer_20_gridcells_"+str_start+'_'+i.toString(), 
              
//   }); 
//   outputs.push(feat) 
// }

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// 02 kMeans //////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
function kmeans02 (snicPts,SNICimagery){
  //take the snic outputs from the previous steps and then train and run a kmeans model
  var snicKmeansImagery = ee.Image(SNICimagery).select(["B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"]); 
  var kMeansImagery = ltop.runKmeans(snicPts, 5001,aoi,snicKmeansImagery); 
  var kMeansPoints = ltop.selectKmeansPts(kMeansImagery,aoi); 
  //there is an issue where a random selection of 75k points from the snic centroids don't necessarily get all of the kmeans clusters 
  //especially the small ones. This means that we need to create a different approach to make sure we get all of the kmeans clusters. 
  //otherwise, what we end up with are these areas masked out in the final output. 
  
  
// var cluster_image = ee.Image("users/ak_glaciers/LTOP_snic_seed_points75k_kmeans_servir_basin_c2_comps")

// var cluster_image = ee.Image("users/ak_glaciers/ltop_snic_seed_points75k_kmeans_cambodia_c2_1990")
  
  //now we recreate the steps in QGIS where we sample the kmeans raster using the points from SNIC in the previous step
  // var kMeansPts = ltop.samplePts(snicPts, kMeansImagery); 
  // //the output is named 'first', this is something that should be changed
  
  // //now we need to drop duplicates but get a random snic centroid in places where there are duplicates
  // //its not totally clear if this is working or not. There don't seem to be any duplicates which 
  // //could be an error or could just be due to the small space 
  // kMeansPts = ltop.cleanKmeansPts(kMeansPts); 
  // kMeansPts = kMeansPts.sort('first'); 
  
  //export the kmeans output to an asset, we'll come back to that later
  Export.image.toAsset({
              image: kMeansImagery, 
              description:"LTOP_kmeans_cluster_image_"+place+"_c2_"+str_start, 
              assetId:"ben/ltop_testing/LTOP_kmeans_cluster_image_"+place+"_c2_"+str_start, 
              region:aoi, 
              scale:30,
              maxPixels:1e13, 
  }); 
  
  Export.table.toAsset({
              collection:kMeansPoints,
              description: 'LTOP_'+place+'_kmeans_stratified_random_cluster_points_new_workflow', 
              assetId:'ben/ltop_testing/LTOP_'+place+'_kmeans_stratified_random_cluster_points_new_workflow'
  }); 
  
  return kMeansPoints; 
}
/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// 03 abstractSampler /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
function abstractSampler03_1 (full_timeseries, kMeansPts){
//add spectral indices to the annual ic
var images_w_indices = ltop.computeIndices(full_timeseries); 

//extract values from the composites at the points created in the kmeans step above 
var spectralExtraction = ltop.runExtraction(images_w_indices, kMeansPts, startYear, endYear);
  
// Select out the relevant fields
var abstractImageOutputs = spectralExtraction.select(['cluster_id', 'year', 'NBR', 'TCW', 'TCG', 'NDVI', 'B5'], null, false);//.sort('cluster_id');

// Export the points
Export.table.toDrive({
  collection: abstractImageOutputs, 
  description: "LTOP_"+place+"_Abstract_Sample_annualSRcollection_NBRTCWTCGNDVIB5_c2_"+str_start+"_start", 
  fileNamePrefix: "LTOP_"+place+"_Abstract_Sample_annualSRcollection_NBRTCWTCGNDVIB5_c2_"+str_start+"_start", 
  folder:place+'_abstract_images',
  fileFormat: 'csv'
});
return null; 
}

function abstractSampler03_2(img_path){
  //this has to be called separately after the first half is dealt with outside GEE
  //replaces the manual creation of an imageCollection after uploading abstract images 
  var abstractImages = []; 
  for (var y = startYear; y < endYear+1; y++){
    var img = ee.Image(img_path+y.toString()); 
    abstractImages.push(img); 
  }
  //this is the primary input to the 04 script 
  var abstractImagesIC = ee.ImageCollection.fromImages(abstractImages); 
  return abstractImagesIC; 
}
/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// 04 abstractImager /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
function abstractImager04(abstractImages){
  //wrap this into a for loop
  var indices = ['NBR', 'NDVI', 'TCG', 'TCW', 'B5']; 
  for(var i in indices){
    // Rename the bands (can't upload with names as far as I can tell)
    abstractImagesIC = abstractImagesIC.select(['b1','b2','b3','b4','b5'],indices);
    
    //this calls the printer function that runs different versions of landTrendr
    var multipleLToutputs = ltop.runLTersions(abstractImages,indices[i]); 
    
    //this merges the multiple LT runs
    var combinedLToutputs = ltop.mergeLToututs(multipleLToutputs); 
    
    //then export the outputs - the paramater selection can maybe be done in GEE at some point but its 
    //a big python script that needs to be translated into GEE 
    Export.table.toDrive({
      collection: combinedLToutputs,
      description: "LTOP_"+place+"_abstractImageSample_lt_144params_"+indices[i]+"_c2_revised_ids",
      folder: "LTOP_"+place+"_abstractImageSamples_c2_revised_ids",
      fileFormat: 'CSV'
    }); 
  }
  return null; 
}
/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// 05 Optimized Imager ////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
//the primary inputs for this are the kmeans image and the selected params 
//kmeans image output
// var cluster_image = ee.Image("users/ak_glaciers/ltop_snic_seed_points75k_kmeans_cambodia_c2_1990")
// Map.addLayer(cluster_image,{},'cluster image')
// //selected params from the two python scripts that come after the 04 script 
// var table = ee.FeatureCollection("users/ak_glaciers/LTOP_Cambodia_config_selected_220_kmeans_pts_new_weights");

// cast the feature collection (look up table) to list so we can filter and map it. Note that the number needs to be adjusted here 
//to the number of unique cluster ids in the kmeans output 

function optimizedImager05(table,full_timeseries,kmeans_output){
  var lookUpList =  table.toList(table.size());   
  
  //transformed Landsat surface reflectance image collection - this likewise would need to be changed for more indices 
  var annualLTcollectionNBR = ltgee.buildLTcollection(annualSRcollection, 'NBR', ["NBR"]).select(["NBR","ftv_nbr"],["NBR","ftv_ltop"]); 
  var annualLTcollectionNDVI = ltgee.buildLTcollection(annualSRcollection, 'NDVI', ["NDVI"]).select(["NDVI","ftv_ndvi"],["NDVI","ftv_ltop"]); 
  var annualLTcollectionTCW = ltgee.buildLTcollection(annualSRcollection, 'TCW', ["TCW"]).select(["TCW","ftv_tcw"],["TCW","ftv_ltop"]); 
  var annualLTcollectionTCG = ltgee.buildLTcollection(annualSRcollection, 'TCG', ["TCG"]).select(["TCG","ftv_tcg"],["TCG","ftv_ltop"]); 
  var annualLTcollectionB5 = ltgee.buildLTcollection(annualSRcollection, 'B5', ["B5"]).select(["B5","ftv_b5"],["B5","ftv_ltop"]); 
  
  //now call the function for each index we're interested in 
  var printerB5 = ltop.printerFunc(ltop.filterTable(lookUpList,'B5'), annualLTcollectionB5, kmeans_output); 
  var printerNBR = ltop.printerFunc(ltop.filterTable(lookUpList,'NBR'), annualLTcollectionNBR, kmeans_output); 
  var printerNDVI = ltop.printerFunc(ltop.filterTable(lookUpList,'NDVI'), annualLTcollectionNDVI, kmeans_output); 
  var printerTCG = ltop.printerFunc(ltop.filterTable(lookUpList,'TCG'), annualLTcollectionTCG, kmeans_output);
  var printerTCW = ltop.printerFunc(ltop.filterTable(lookUpList,'TCW'), annualLTcollectionTCW, kmeans_output);
  
  // concat each index print output together
  var combined_lt = printerB5.cat(printerNBR).cat(printerNDVI).cat(printerTCG).cat(printerTCW); 
  
  //Mosaic each LandTrendr run in list to single image collection
  var ltcol = ee.ImageCollection(combined_lt).mosaic(); 
  
  var params = { 
    timeSeries: ee.ImageCollection([]),
    maxSegments: 10,
    spikeThreshold: 5,
    vertexCountOvershoot: 3,
    preventOneYearRecovery: true,
    recoveryThreshold: 5,
    pvalThreshold: 5,
    bestModelProportion: 0.75,
    minObservationsNeeded: 5
  };
  
  //create the vertices in the form of an array image
  var lt_vert = ltgee.getLTvertStack(ltcol, params).select([0,1,2,3,4,5,6,7,8,9,10]).int16(); 
  
  Export.image.toAsset({
    image: lt_vert,
    description: 'Optimized_LT_1990_start_'+place+'_remapped_cluster_ids',
    assetId: 'Optimized_LT_1990_start_'+place+'_remapped_cluster_ids',
    region: aoi,
    scale: 30,
    maxPixels: 1e13
  });   
  return null; 
  
}