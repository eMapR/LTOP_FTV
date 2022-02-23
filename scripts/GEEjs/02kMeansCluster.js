//######################################################################################################## 
//#                                                                                                    #\\
//#                                         LANDTRENDR LIBRARY                                         #\\
//#                                                                                                    #\\
//########################################################################################################


// date: 2020-12-10
// author: Peter Clary    | clarype@oregonstate.edu
//         Robert Kennedy | rkennedy@coas.oregonstate.edu
// website: https://github.com/eMapR/LT-GEE

//Note: this has been modified to run for SE asia

//////////////////Import Modules ////////////////////////////
var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 

/////////////////////Cambodia vector////////////////////////////
//Centers the map on spatial features 
var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA','Laos')).geometry().buffer(5000);
//ee.FeatureCollection("TIGER/2018/States").filterMetadata("NAME","equals","Oregon").geometry().buffer(5000);

Map.centerObject(aoi)
//Map.addLayer(aoi)

////////////////////params//////////////////////////
var startYear = 1999; 
var endYear = 2020;
var startDate = '11-20'; 
var endDate =   '03-10';
// var startDate = '06-20'; 
// var endDate =   '09-10'; 
var masked = ['cloud', 'shadow', 'snow'] // Image masking options ie cloud option tries to remove clouds from the imagery. powermask in new and has magic powers ... RETURN TO THIS AND ADD MORE DETAIL
var folder = "LTOP_Laos_Kmeans_v1" 
var description = "Kmeans_v1"

////////////////////////Landsat Composites///////////////////////////////
var dummyCollection = ee.ImageCollection([ee.Image([0,0,0,0,0,0]).mask(ee.Image(0))]);

var getCombinedSRcollection20 = ltgee.getCombinedSRcollection(2020, startDate, endDate, aoi, masked);
var getCombinedSRcollection10 = ltgee.getCombinedSRcollection(2010, startDate, endDate, aoi, masked);
var getCombinedSRcollection00 = ltgee.getCombinedSRcollection(2000, startDate, endDate, aoi, masked);

// make a medoid composite with equal weight among indices
var medoidMosaic = function(inCollection, dummyCollection) {
  
  // fill in missing years with the dummy collection
  var imageCount = inCollection.toList(1).length();                                                            // get the number of images 
  var finalCollection = ee.ImageCollection(ee.Algorithms.If(imageCount.gt(0), inCollection, dummyCollection)); // if the number of images in this year is 0, then use the dummy collection, otherwise use the SR collection
  
  // calculate median across images in collection per band
  var median = finalCollection.median();                                                                       // calculate the median of the annual image collection - returns a single 6 band image - the collection median per band
  
  // calculate the different between the median and the observation per image per band
  var difFromMedian = finalCollection.map(function(img) {
    var diff = ee.Image(img).subtract(median).pow(ee.Image.constant(2));                                       // get the difference between each image/band and the corresponding band median and take to power of 2 to make negatives positive and make greater differences weight more
    return diff.reduce('sum').addBands(img);                                                                   // per image in collection, sum the powered difference across the bands - set this as the first band add the SR bands to it - now a 7 band image collection
  });
  
  // get the medoid by selecting the image pixel with the smallest difference between median and observation per band 
  return ee.ImageCollection(difFromMedian).reduce(ee.Reducer.min(7)).select([1,2,3,4,5,6], ['B1','B2','B3','B4','B5','B7']); // find the powered difference that is the least - what image object is the closest to the median of teh collection - and then subset the SR bands and name them - leave behind the powered difference band
};

var medaic20 = medoidMosaic(getCombinedSRcollection20, dummyCollection)
var medaic10 = medoidMosaic(getCombinedSRcollection10, dummyCollection)
var medaic00 = medoidMosaic(getCombinedSRcollection00, dummyCollection)

var LandsatComposites = medaic20.addBands(medaic10).addBands(medaic00)

////////////////////SNIC/////////////////////////////
var snicImagey = ee.Algorithms.Image.Segmentation.SNIC({
  image: LandsatComposites,
  size: 10, //changes the number and size of patches 
  compactness: 1, //degrees of irregularity of the patches from a square 
  }).clip(aoi);
  
/////////////////10k sample ////////////////////////////STEP 2
//pull in the subsampled and attributed 75k points
var sample75k = ee.FeatureCollection("users/ak_glaciers/snic_seed_pixels_75k_pts_w_attributes");
Map.addLayer(sample75k)
print(sample75k.first())

////////////////////SNIC/////////////////////////////
var patchRepsMean = snicImagey.select(["seeds", "clusters",  "B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"]);

var patchRepSeeds = snicImagey.select(['seeds']);

///////Select singel pixel from each patch/////////////
print(patchRepsMean.bandNames())
var SNIC_means_seed = patchRepSeeds.multiply(patchRepsMean).select(["B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"],["seed__3",  "seed__4",  "seed__5",  "seed__6",  "seed__7",  "seed__8",  "seed__9",  "seed__10",  "seed__11",  "seed__12","seed__13",  "seed__14",  "seed__15",  "seed__16",  "seed__17",  "seed__18",  "seed__19", "seed__20"])//.reproject({  crs: 'EPSG:4326',  scale: 30});//.clip(aoi)
var SNIC_means_image = patchRepsMean.select(["B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"],["seed__3",  "seed__4",  "seed__5",  "seed__6",  "seed__7",  "seed__8",  "seed__9",  "seed__10",  "seed__11",  "seed__12","seed__13",  "seed__14",  "seed__15",  "seed__16",  "seed__17",  "seed__18",  "seed__19", "seed__20"])//.reproject({  crs: 'EPSG:4326',  scale: 30});//.clip(aoi)
print(SNIC_means_image.bandNames())

/////////////////Train////////////////////////////
var training = ee.Clusterer.wekaCascadeKMeans(5000,5001).train({ 
  features: sample75k, 
  //inputProperties:["B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"]
  inputProperties:["seed__3",  "seed__4",  "seed__5",  "seed__6",  "seed__7",  "seed__8",  "seed__9",  "seed__10",  "seed__11",  "seed__12","seed__13",  "seed__14",  "seed__15",  "seed__16",  "seed__17",  "seed__18",  "seed__19", "seed__20"]
});
print(training)

// // // //////////////Clusterer//////////////
var clusterImage = SNIC_means_image.cluster(training).clip(aoi);
var clusterSeed = SNIC_means_seed.cluster(training).clip(aoi);

// //////////////Kmeans cluster Export//////////////
      
// Export.image.toDrive({
//         image:clusterImage, 
//         description: description, 
//         folder: folder, 
//         fileNamePrefix: "LTOP_Oregon_image_", 
//         //region:aoi, 
//         scale:30, 
//         maxPixels: 1e13 
//       })   
  
Export.image.toAsset({
        image:clusterImage, 
        description: description, 
        assetId: "LTOP_Laos_Kmeans_Cluster_Image", 
        region:aoi, 
        scale:30, 
        maxPixels: 1e13 
      })   
      
Export.image.toDrive({
        image:clusterSeed, 
        description: description, 
        folder:folder, 
        fileNamePrefix: "LTOP_Laos_seed_", 
        region:aoi, 
        scale:30, 
        maxPixels: 1e13 
      })   
