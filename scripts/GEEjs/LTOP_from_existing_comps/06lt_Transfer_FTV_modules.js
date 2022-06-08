
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


///////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////
//the outputs of LTOP have to be converted to an array and empty (0) entries have to be removed 
var prepBreakpoints = function(ltop_output){
  var arr = ltop_output.toArray(); 
  var mask = ltop_output.gt(0).toArray(); 

  //apply the mask to the array   
  return arr.arrayMask(mask); 
}; 

exports.prepBreakpoints = prepBreakpoints; 

///////////////////////////////////////////////////////////////////////////////////////////////////////

//prepare the breakpoints for use in the LandTrendr fit algorithm
//get the bp years between two end point years. In the case that there is no bp in the start year we need to set that as a breakpoint 
//so the time series is bookended when we do the fit 

var clipBreakpoints = function(startYear,LTOP_band,lt_vert){
  //this function is only required if the input imageCollection is shorter than the thing you used to create breakpoints
  //LTOP_band is a band that doesn't exist in the inputs but is structured in the same way
  //lt_vert is the output of the LTOP process and should be an array image of LT breakpoints 
  
  //create an image of constant value with starting year val. This will be used to ensure we have the starting bp
  var yearImg = ee.Image.constant(startYear).select(['constant'],[LTOP_band]); 
  
  //get the array of breakpoints from the LTOP outputs 
  var bps = lt_vert.toArray(); 
  
  //create a mask that gets rid of everything before the start year plus one. We add one to make sure that when we add the start 
  //year back in we don't get the start year twice (duplicate breakpoints)
  var mask = lt_vert.gte(startYear+1).toArray(); 
  
  //apply the mask to the array 
  bps = bps.arrayMask(mask); 
  //add the constant image above as an array with the start year as the constant value
  bps = bps.arrayCat({
    image2:yearImg.toArray(),
    axis:0
  }); 
  
  //sort the array values so that the breakpoint years are in chronological order after adding a band
  bps = bps.arraySort(); 
  return bps;  
}; 

exports.clipBreakpoints = clipBreakpoints
//breakpoints should now be ready to use as input to the LandTrendr fit algorithm 
///////////////////////////////////////////////////////////////////////////////////////////////////////

// Insert a process that selects different spikeThreshold params for LT based on the different K-means clusters from the optimization process. This is a masking process
//whereby each of the options for spikeThreshold are selected and used as a mask to run different paramaterizations of LT-fit and then those are patched backtogether at the end.
var runLTfit = function(table,input_ic,breakpoints,kmeans_image,min_obvs){
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
    var mask = kmeans_image.remap(clusters,ee.List.repeat(1,clusters.length())); 
    //add a prop with the spikeThreshold value so we can query it later
    return mask.set('spikeThreshold',x); 
  }); 
  
  
  //these are the masks we want for running LandTrendr fit 
  var spike_masks = ee.ImageCollection.fromImages(filter_pixels); 
  
  //run LandTrendr
  var masked_ic = spike_masks.map(function(msk){
    //map over the ic, masking each image in the collection as we go
    var ic = input_ic.map(function(img){
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
  return combined; 
}; 

exports.runLTfit = runLTfit; 

///////////////////////////////////////////////////////////////////////////////////////////////////////
//Convert the outputs of LT fit to look like the outputs of LT premium (i.e., 4xn array). 

var convertLTfitToLTprem = function(lt_fit_output,export_band,startYear,endYear){
  // print('You are converting LT fit output (1D array) to a 4xn array like the outputs of full LandTrendr.')
  // print('For more information on this format please see: https://emapr.github.io/LT-GEE/lt-gee-outputs.html')
  //select one band to test the outputs of the LT fit step. This has each year as a band. 
  var ftv = lt_fit_output.select([export_band]); 
  
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

return lt_out; 
}; 

exports.convertLTfitToLTprem = convertLTfitToLTprem; 
