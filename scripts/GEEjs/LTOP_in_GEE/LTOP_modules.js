//######################################################################################################## 
//#                                                                                                    #\\
//#                                          LandTrendr Optimization (LTOP) library                    #\\
//#                                                                                                    #\\
//########################################################################################################


// date: 2020-12-10
// author: Peter Clary        | clarype@oregonstate.edu
//         Robert Kennedy     | rkennedy@coas.oregonstate.edu
//         Ben Roberts-Pierel | robertsb@oregonstate.edu
// website: https://github.com/eMapR/LT-GEE


//  This program takes a raster stack of images and constellates pixels that are spectrally similar around a 
//  seed pixel. The rasters used are harmonized landsat images for a given date window in a year over a yearly 
//  time series.   
var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 


/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// 01 SNIC ////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

//run SNIC and return the imagery 
var runSNIC = function(composites,aoi){
var snicImagery = ee.Algorithms.Image.Segmentation.SNIC({
  image: composites,
  size: 10, //changes the number and size of patches 
  compactness: 1, //degrees of irregularity of the patches from a square 
  }).clip(aoi);
  
  return snicImagery;
  
}; 

exports.runSNIC = runSNIC; 

//now split the SNIC bands
var getSNICmeanBands = function(snic_output){
  return snic_output.select(["seeds","clusters",  "B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"]);
}; 

var getSNICseedBands = function(snic_output){
  return snic_output.select(['seeds']);
}; 

//select a single pixel from each patch, convert to int, clip and reproject. This last step is to mimic 
//the outputs of QGIS
var SNICmeansImg = function(snic_output,aoi){
  return getSNICseedBands(snic_output).multiply(getSNICmeanBands(snic_output))
                                      // .toInt32().clip(aoi)
                                      // .reproject({  crs: 'EPSG:4326',  scale: 30}); 
};

exports.SNICmeansImg = SNICmeansImg; 

//now we mimic the part that was happening in QGIS where we make noData, convert pixels to pts, subset and get seed data 

var pixelsToPts = function(img,aoi){
  //convert
  var vectors = img.sample({
  region: aoi,//.geometry().buffer(-250),
  geometries: true,
  scale:30, 
  projection:'EPSG:4326', 
  }); 
  return ee.FeatureCollection(vectors); 
}; 

//try reduceToVectors
// var pixelsToPts = function(img,aoi){
//   var vectors = img.reduceToVectors({
//     geometry:aoi, 
//     scale:30, 
//     geometryType:'centroid',
//     maxPixels:1e13
//   });
//   return vectors; 
  
// }; 


// exports.pixelsToPts = pixelsToPts;  

//subset fc
var subsetFC = function(fc,grid_pts_max){
  var output_fc = fc.randomColumn({
  columnName:'random',
  seed:2,
  distribution:'uniform'
  }); 
  output_fc = ee.FeatureCollection(output_fc.sort('random')
                                            .toList(grid_pts_max)
                                            .slice(0,grid_pts_max)); 
  return output_fc; 
}; 

// exports.subsetFC = subsetFC; 
//there is an issue where GEE complains if we straight convert pixels to points because there are too many. Try tiling the image and converting those first. 
var splitPixImg = function(means_img,grid){
  //we map over the grid tiles, subsetting the image
  var num_pts = 50//(ee.Number(pts_max).divide(ee.Number(grid.size()))).toInt(); 
  var tile_pts = grid.map(function(feat){
  var tile_bounds = feat.geometry().buffer(-250) //could be changed
  var img_tile = means_img.clip(tile_bounds); //remove this if it errors 
  var pts = pixelsToPts(means_img,tile_bounds); 
  //try subsetting the points here before putting them back together to reduce the size of the dataset 
  pts = subsetFC(pts,num_pts); 
  return pts 
  }); 
  return tile_pts.flatten(); 
}; 

exports.splitPixImg = splitPixImg; 

var samplePts = function(pts,img){
  var output = pts.map(function(pt){
    var value = img.reduceRegion({
    reducer:ee.Reducer.first(), 
    geometry:pt.geometry(),
    scale:30
    
    }); 
  return ee.Feature(pt.geometry(),value); 
  }); 
  return ee.FeatureCollection(output); 
}; 
  // var output = img.reduceRegions({
  //   collection:pts, 
  //   reducer: ee.Reducer.first(), 
  //   scale: 30
  // }); 
  // return output; 


// exports.samplePts = samplePts; 


/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// 02 kMeans //////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
//the first handful of functions that make composites and run SNIC in the original workflow are just recycled from above. We only add the kmeans here
//note also that the band structure is different in this version than what's generated in QGIS

//train a kmeans model 
var trainKmeans = function(snic_cluster_pts,num_clusters){
  var training = ee.Clusterer.wekaCascadeKMeans({minClusters:num_clusters, maxClusters:num_clusters}).train({ 
    features: snic_cluster_pts, 
    //real names:["B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"]
    inputProperties:["B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"]
    // inputProperties:["seed_3",  "seed_4",  "seed_5",  "seed_6",  "seed_7",  "seed_8",  "seed_9",  "seed_10",  "seed_11",  "seed_12","seed_13",  "seed_14",  "seed_15",  "seed_16",  "seed_17",  "seed_18",  "seed_19", "seed_20"]
  });
  return training; 
}; 

//run the kmeans model - note that the inputs are being created in the snic section in the workflow document 
var runKmeans = function(snic_cluster_pts,num_clusters,aoi,snic_output){
  //train a kmeans model
  var trainedModel = trainKmeans(snic_cluster_pts,num_clusters); 
  //call the trained kmeans model 
  var clusterSeed = snic_output.cluster(trainedModel).clip(aoi);
  return clusterSeed; 
}; 

exports.runKmeans = runKmeans; 

var selectKmeansPts = function(img,aoi){
  var kmeans_points = img.stratifiedSample({
  numPoints:1,
  classBand:'cluster',
  region:aoi, 
  scale:30, 
  seed:5,
  geometries:true
})
return kmeans_points
}

exports.selectKmeansPts = selectKmeansPts; 

//DEPRECATED (I think...)
//now we replace the steps done in QGIS to get the cluster ids with the pts from the SNIC section 
var cleanKmeansPts = function(pts){
  //this function needs to drop duplicates but take a random pt in cases where there is a duplicate 
  var ids = pts.aggregate_array('first'); //hardcoded for first, this should probably be changed 
  var output_pts = ids.map(function(id){
    var fc = pts.filter(ee.Filter.eq('first',id)); 
    fc = fc.randomColumn('kmeans_rand',2,'uniform')
           .sort('kmeans_rand')
           .first(); 
    return fc; 
  }); 
  return ee.FeatureCollection(output_pts); 
}; 

exports.cleanKmeansPts = cleanKmeansPts; 



/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// 03 abstractSampler /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

//make function to calculate spectral indices 
var computeIndices = function(ic){
  var output_ic = ic.map(function(img){
  // Calculate Tasseled Cap Brightness, Greenness, Wetness
  var bands = img.select(['B1','B2','B3','B4','B5','B7']);
  var coefficients = ee.Array([ 
    [0.2043, 0.4158, 0.5524, 0.5741, 0.3124, 0.2303],
    [-0.1603, -0.2819, -0.4934, 0.7940, -0.0002, -0.1446],
    [0.0315, 0.2021, 0.3102, 0.1594, -0.6806, -0.6109],
    ]);
  var components = ee.Image(coefficients)
    .matrixMultiply(bands.toArray().toArray(1))
    .arrayProject([0])
    .arrayFlatten([['TCB','TCG','TCW']])
    //.multiply(-1)
    .toFloat();
  img = img.addBands(components);
  
  // Compute NDVI and NBR
  img = img.addBands(img.normalizedDifference(['B4','B3']).toFloat().rename(['NDVI']).multiply(1000));
  img = img.addBands(img.normalizedDifference(['B4','B7']).toFloat().rename(['NBR']).multiply(1000));

  return img.select(['NBR', 'TCW', 'TCG', 'NDVI', 'B5']).toFloat();
  }); 
  return output_ic
}; 

exports.computeIndices = computeIndices; 

// Run the extraction

var runExtraction = function(images, points, start_year, end_year) {
  
  // Function that is applied to each year
  function inner_map (year) {
    
    // Cast the input
    year = ee.Number(year).toInt16();
    
    // Construct the dates to filter the image collection
    var start_date = ee.Date.fromYMD(year, 1, 1);
    var end_date = ee.Date.fromYMD(year, 12, 31);
    
    // Get the image to sample
    var current_image = ee.Image(images.filterDate(start_date, end_date).first())
      .addBands(ee.Image.constant(year).rename('year'))
      .unmask(-32768)
      .toInt16();
    
    // Run an extraction
    var extraction = current_image.reduceRegions({
      collection: points, 
      reducer: ee.Reducer.first(), 
      scale: 30,
    });
    
    return extraction.toList(points.size()); // Peter 
    
  }
  
  // Create a list of years to map over
  var years = ee.List.sequence(start_year, end_year);
  
  // Flatten the outputs
  var outputs = ee.FeatureCollection(ee.List(years.map(inner_map)).flatten());
  
  return outputs;
  
}; 

exports.runExtraction = runExtraction; 

/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// 04 abstractImager //////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
//define some LT params for the different versions of LT run below: 
// LandTrendr Parameters 
///////////////////////////////////////////////////////////
var runParams = [{timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 6 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 6 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 8 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 8 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 10 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 10 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.75, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.25, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.5, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 0.9, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.1, bestModelProportion: 0.75, minObservationsNeeded: 11 }, {timeSeries: ee.ImageCollection([]), maxSegments: 11 , spikeThreshold: 1.0, vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: 1.0, pvalThreshold: 0.15, bestModelProportion: 0.75, minObservationsNeeded: 11 }];

//function to create a timestamp for the abstract images 
// Add a time stamp based on the system:id property
var addTimeStamp = function(image) {
  
  // Get the year from the system:id property
  var year = ee.Number.parse(ee.String(image.get('system:id')).slice(-4)).toInt16();
  
  // Create a date object
  var date = ee.Date.fromYMD(year, 8, 1).millis();
  
  return image.set('system:time_start', date);
}; 

// Update the mask to remove the no-data values so they don't mess
// up running LandTrendr -- assumes the no-data value is -32768
var maskNoDataValues = function(img) {
  // Create the mask
  var img_mask = img.neq(-32768);
  return img.updateMask(img_mask);
}; 

var getPoint2 = function(geom,img, z) {
  
  return img.reduceRegions({collection: geom, reducer: 'first',  scale: z });//.getInfo();

};

var runLTversions = function(ic,indexName,id_points){
  // here we map over each LandTrendr parameter varation, applying each varation to the abstract image 
  var printer = runParams.map(function(param){

  // this statment finds the index of the parameter varation being used 
  var index = runParams.indexOf(param); 
  
  // here we select the indice image on which to run LandTrendr 
  runParams[index].timeSeries = ic.select([indexName]);
    
  // run LandTrendr 
  var lt = ee.Algorithms.TemporalSegmentation.LandTrendr(runParams[index]);
  
  //select the segmenation data from LandTrendr
  var ltlt = lt.select(['LandTrendr']);
  
  // slicde the LandTrendr data into sub arrays
  var yearArray = ltlt.arraySlice(0,0,1).rename(['year']);
  var sourceArray = ltlt.arraySlice(0,1,2).rename(['orig']);
  var fittedArray = ltlt.arraySlice(0,2,3).rename(['fitted']);
  var vertexMask = ltlt.arraySlice(0, 3, 4).rename(['vert']); 
  var rmse = lt.select(['rmse']);

  // place each array into a image stack one array per band 
  var lt_images = yearArray.addBands(sourceArray)
                           .addBands(fittedArray)
                           .addBands(vertexMask)
                           .addBands(rmse);

  // extract a LandTrendr pixel times a point
  var getpin2 = getPoint2(id_points,lt_images,20); // add scale 30 some points (cluster_id 1800 for example) do not extract lt data. I compared the before change output with the after the chagne output and the data that was in both datasets matched. compared 1700 to 1700 ...  
  
  // maps over a feature collection that holds the LandTrendr data and adds attributes : index, params and param number.
  var attriIndexToData = getpin2.map(function(feature){
    
    return feature.set('index', indexName)
                  .set('params',runParams[index])
                  .set('param_num', index);
    
  });

  return attriIndexToData;

  });
  return printer; 
}; 

exports.runLTversions = runLTversions; 

var mergeLToutputs = function(lt_outputs){
// empty variable to a merged feature collection
var featCol;

// loop over each feature collection and merges them into one
for(var i in lt_outputs ){
  if(i == 0){
    featCol = lt_outputs[0];
    }else if (i>0){
      featCol = featCol.merge(lt_outputs[i]);
    }
}
return featCol; 
}; 

exports.mergeLToutputs = mergeLToutputs; 


/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// 05 Optimized Imager ////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

//write a new general function that takes the place of all the copied functions below - plan to map this over the lists above
//input args are the index tables above and the associated imageCollection
var printerFunc = function(fc,ic,cluster_image,aoi){
  var output = fc.map(function(feat){
    //changes feature object to dictionary
    var dic = ee.Feature(feat).toDictionary();
  
    //calls number value from dictionary feature key, maxSegments.
    var maxSeg = dic.getNumber('maxSegments');
  
    //calls number value from dictionary feature key, spikeThreshold.
    var spikeThr = dic.getNumber('spikeThreshold');
  
    //calls number value from dictionary feature key, recoveryThreshold.
    var recov = dic.getNumber('recoveryThreshold'); 
  
    // calls number value from dictionary feature key, pvalThreshold.
    var pval = dic.getNumber('pvalThreshold');
    
    // LandTrendr parameter dictionary template.
    var runParamstemp = { 
      timeSeries: ee.ImageCollection([]),
      maxSegments: maxSeg,
      spikeThreshold: spikeThr,
      vertexCountOvershoot: 3,
      preventOneYearRecovery: true,
      recoveryThreshold: recov,
      pvalThreshold: pval,
      bestModelProportion: 0.75,
      minObservationsNeeded: maxSeg
    };
  
    // get cluster ID from dictionary feature as a number
    var cluster_id = ee.Number(dic.get('cluster_id')).float();
    
    // creates a mask keep pixels for only a single cluster - changed for something more simple
    var cluster_mask = cluster_image.eq(cluster_id).selfMask();
    
    // blank
    var maskcol;
  
    //maps over image collection applying the mask to each image
    maskcol = ic.map(function(img){
      var out = img.updateMask(cluster_mask).set('system:time_start', img.get('system:time_start'));
      return out;
    });
    
    // apply masked image collection to LandTrendr parameter dictionary
    runParamstemp.timeSeries = maskcol;
    
    //Runs LandTrendr
    var lt = ee.Algorithms.TemporalSegmentation.LandTrendr(runParamstemp).clip(aoi);//.select(0)//.unmask();
    
    // return LandTrendr image collection run to list.
    return lt; 

}); 
  //this might be a little redundant but its a way to deal with the map statements 
  return output; 
}; 

exports.printerFunc = printerFunc; 

var filterTable = function(pt_list,index){
  return pt_list.filter(ee.Filter.eq('index',index)); 
}; 


/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// Invoking functions /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
//now set up functions for calling each step?? 

//////////////////////////////////////////////////////
//////////////////////////////// 01 SNIC /////////////
//////////////////////////////////////////////////////
function snic01 (snic_composites,aoi,grid_scale,epsg){
  //run the SNIC algorithm   
  var SNICoutput = runSNIC(snic_composites,aoi); 
  var SNICpixels = SNICmeansImg(SNICoutput,aoi); 
  
  //these were previously the two things that were exported to drive 
  var SNICimagery = SNICoutput.toInt32()//.reproject({  crs: 'EPSG:4326',  scale: 30}); //previously snicImagery
  var SNICmeans = SNICpixels.toInt32().clip(aoi); //previously SNIC_means_image
  
  //try just creating some random points 
  // var snicPts = ee.FeatureCollection.randomPoints({
  //   region:aoi,
  //   points:20000,
  //   seed:10
  //   })
  
  // snicPts = samplePts(snicPts,SNICimagery); 
  //create a grid to subtile the snic images
  var grid = aoi.coveringGrid(epsg, grid_scale).filterBounds(aoi); //the int here is a bit variable
  
  var snicPts = splitPixImg(SNICmeans.select('clusters'),grid)
  
  // do the sampling 
  snicPts = samplePts(snicPts,SNICimagery); 
  
  return ee.List([snicPts,SNICimagery]); 
// return null
  
}

exports.snic01 = snic01; 
/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// 02 kMeans //////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
function kmeans02 (snicPts,SNICimagery,aoi){
  //take the snic outputs from the previous steps and then train and run a kmeans model
  var snicKmeansImagery = ee.Image(SNICimagery).select(["B1_mean", "B2_mean",  "B3_mean",  "B4_mean",  "B5_mean",  "B7_mean",  "B1_1_mean",  "B2_1_mean",  "B3_1_mean",  "B4_1_mean",  "B5_1_mean","B7_1_mean",  "B1_2_mean",  "B2_2_mean",  "B3_2_mean",  "B4_2_mean",  "B5_2_mean",  "B7_2_mean"]); 
  var kMeansImagery = runKmeans(snicPts, 5001,aoi,snicKmeansImagery); 
  var kMeansPoints = selectKmeansPts(kMeansImagery,aoi); 
  // return kMeansPoints
  return ee.List([kMeansImagery,kMeansPoints]); 
}

exports.kmeans02 = kmeans02; 
/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// 03 abstractSampler /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
function abstractSampler03_1 (full_timeseries, kMeansPts, startYear, endYear){
//rename the kmeans points dataset cluster col to cluster_id, that's what the remaining scripts expect
kMeansPts = kMeansPts.map(function(feat){
  return feat.set('cluster_id',feat.get('cluster'))
})

//add spectral indices to the annual ic
var images_w_indices = computeIndices(full_timeseries); 

//extract values from the composites at the points created in the kmeans step above 
var spectralExtraction = runExtraction(images_w_indices, kMeansPts, startYear, endYear);
  
// Select out the relevant fields
var abstractImageOutputs = spectralExtraction.select(['cluster_id', 'year', 'NBR', 'TCW', 'TCG', 'NDVI', 'B5'], null, false);//.sort('cluster_id');


return abstractImageOutputs; 
}

exports.abstractSampler03_1 = abstractSampler03_1; 

function abstractSampler03_2(img_path,startYear,endYear){
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

exports.abstractSampler03_2 = abstractSampler03_2
/////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// 04 abstractImager /////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
function abstractImager04(abstractImagesIC,place,id_points){
  //wrap this into a for loop
  var indices = ['NBR', 'NDVI', 'TCG', 'TCW', 'B5']; 
  // Add a time stamp to each image
  abstractImagesIC = abstractImagesIC.map(addTimeStamp);

  // Mask the "no-data" values
  abstractImagesIC = abstractImagesIC.map(maskNoDataValues);
  
  // Rename the bands (can't upload with names as far as I can tell)
  abstractImagesIC = abstractImagesIC.select(['b1','b2','b3','b4','b5'],indices); //changed to uppercase
    
  for(var i in indices){
    
    //this calls the printer function that runs different versions of landTrendr
    var multipleLToutputs = runLTversions(abstractImagesIC,indices[i],id_points); 
    
    //this merges the multiple LT runs
    var combinedLToutputs = mergeLToutputs(multipleLToutputs); 
    
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

exports.abstractImager04 = abstractImager04; 
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

function optimizedImager05(table,annualSRcollection,kmeans_output,aoi){
  var lookUpList =  table.toList(table.size());   
  
  //transformed Landsat surface reflectance image collection - this likewise would need to be changed for more indices 
  var annualLTcollectionNBR = ltgee.buildLTcollection(annualSRcollection, 'NBR', ["NBR"]).select(["NBR","ftv_nbr"],["NBR","ftv_ltop"]); 
  var annualLTcollectionNDVI = ltgee.buildLTcollection(annualSRcollection, 'NDVI', ["NDVI"]).select(["NDVI","ftv_ndvi"],["NDVI","ftv_ltop"]); 
  var annualLTcollectionTCW = ltgee.buildLTcollection(annualSRcollection, 'TCW', ["TCW"]).select(["TCW","ftv_tcw"],["TCW","ftv_ltop"]); 
  var annualLTcollectionTCG = ltgee.buildLTcollection(annualSRcollection, 'TCG', ["TCG"]).select(["TCG","ftv_tcg"],["TCG","ftv_ltop"]); 
  var annualLTcollectionB5 = ltgee.buildLTcollection(annualSRcollection, 'B5', ["B5"]).select(["B5","ftv_b5"],["B5","ftv_ltop"]); 
  
  //now call the function for each index we're interested in 
  var printerB5 = printerFunc(filterTable(lookUpList,'B5'), annualLTcollectionB5, kmeans_output,aoi); 
  var printerNBR = printerFunc(filterTable(lookUpList,'NBR'), annualLTcollectionNBR, kmeans_output,aoi); 
  var printerNDVI = printerFunc(filterTable(lookUpList,'NDVI'), annualLTcollectionNDVI, kmeans_output,aoi); 
  var printerTCG = printerFunc(filterTable(lookUpList,'TCG'), annualLTcollectionTCG, kmeans_output,aoi);
  var printerTCW = printerFunc(filterTable(lookUpList,'TCW'), annualLTcollectionTCW, kmeans_output,aoi);
  
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
  
  return lt_vert; 
  
}


exports.optimizedImager05 = optimizedImager05; 
