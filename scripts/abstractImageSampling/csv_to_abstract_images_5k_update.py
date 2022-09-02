from osgeo import gdal
import osgeo.ogr
import osgeo.osr
import rasterio
import pandas as pd
import numpy as np
import os
import sys
'''
This scripts loads in a CSV and converts it into a "abstract image collection".

Given this image is "abstract" in that the information is not-spatial, the output
image will appear near the origin of a project coordinate system.

Script assumptions:
    
    1. This script assumes the exported CSV contains the following fields:
       'unique_id', 'year', 'NBR', 'NDVI', 'TCG', 'TCW', 'B5'
        
    2. This script assumes that EVERY point contains the same number of observations
       for each year of the time series (years with no data should contain the no data value)
       
    3. This script assumes that the no-data value for missing inputs is -32768
    
    4. This script assumes that each pixel location is associated with a unique ID field

    5. This script assumes that the unique ID field starts from zero.
    
'''

def create_rasterio_profile(out_rows, out_cols, num_bands=5):
    '''Create the rasterio export profile. '''

    # Set the properties
    out_profile = {
        'driver': 'GTiff',
        'dtype': rasterio.int16,
        'compress': 'lzw',
        'nodata': -32768,
        'count': num_bands,
        'height': out_rows,
        'width': out_cols,
        'transform': rasterio.Affine(30, 0, 0, 0, -30, 0),
        'crs': 'EPSG:2838'
        }
    
    return out_profile

if __name__ == "__main__":

    ######################## PARAMETERS TO BE SET BY USER ####################
    
    # Load in the "abstract images" csv
    input_data = pd.read_csv("/vol/v1/proj/LTOP_mekong/csvs/01_abstract_images/GEE_LTOP/LTOP_servir_comps_revised_Abstract_Sample_annualSRcollection_NBRTCWTCGNDVIB5_c2_1990_start.csv")
    # Define the output directory for the abstract images and the shapefile
    output_directory_raster = "/vol/v1/proj/LTOP_mekong/rasters/03_AbstractImage/servir_comps_domain_gee_implementation/"
    output_directory_shp = "/vol/v1/proj/LTOP_mekong/vectors/03_abstract_image_pixel_points/servir_comps_domain_gee_implementation/"

    if not os.path.exists(output_directory_raster): 
        os.mkdir(output_directory_raster)
    if not os.path.exists(output_directory_shp): 
        os.mkdir(output_directory_shp)

    # NEW gets the number of unique cluster ids
    number_of_clusters = len(input_data.cluster_id.unique())
    cluster_ids_all = sorted(input_data['cluster_id'].unique())
  
    # Define the output number of rows and columns
    num_rows = 1
    num_cols = number_of_clusters # the number of clusters used 
    
    ##########################################################################
    
    # Get the profile and projection for the export
    export_profile = create_rasterio_profile(num_rows, num_cols)
    
    # Select the relevant fields
    input_data = input_data[['cluster_id', 'year', 'NBR', 'NDVI', 'TCG', 'TCW', 'B5']]
    #input_data = input_data[input_data.cluster_id != 5000]
    # Get the start year and the end year
    start_year = input_data[['year']].min().item()
    end_year = input_data[['year']].max().item()
    #print(start_year,end_year)

    # Loop over the years of the collection
    for current_year in range(start_year, end_year+1):
        
        # Filter 1 years worth of data from the pandas dataframe
        current_data = input_data[input_data['year'] == current_year]
        
        # Sort the dataframe by the "id" field (so that it is always ordered the same way)
        # and then drop the id field and the year field 
        csv_to_raster_input = current_data.sort_values(by="cluster_id")[['NBR', 'NDVI', 'TCG', 'TCW', 'B5']]

        # Convert the data into a numpy array where each       
        # Array_values has the following shape (after the below code)
        # (number_points, 1, num_spectral_bands)

        #print(csv_to_raster_input.to_numpy())
        array_values = csv_to_raster_input.to_numpy()[:,:,np.newaxis]
        array_values = np.swapaxes(array_values, 2, 1)
        
        # Reshape the array into something more square
        array_values = np.reshape(array_values, [num_cols, num_rows, 5])
        
        # Reshape the dimensions before writing out the data
        output_array = np.moveaxis(array_values, [0, 1, 2], [2, 1, 0]).astype('int16') 
        
        # Write out the abstract image
        with rasterio.Env():
            
            # Create the export path
            export_path = output_directory_raster + "revised_abstract_image_" + str(current_year) + ".tif"
            
            # Write out the raster
            with rasterio.open(export_path, 'w', **export_profile) as dst:
                dst.write(output_array)
        
    #########################################################################
    
    # All of this is adapted from: 
    # https://gis.stackexchange.com/questions/42790/gdal-and-python-how-to-get-coordinates-for-all-cells-having-a-specific-value
    
    # Open the last data created
    example_raster = gdal.Open(export_path)
    band = example_raster.GetRasterBand(1)
    
    # Get some coordinates from the raster
    (upper_left_x, x_size, x_rotation, upper_left_y, y_rotation, y_size) = example_raster.GetGeoTransform()
    
    # Filter 1 years worth of data from the pandas dataframe
    shape_array = input_data[input_data['year'] == end_year]
    
    # Sort the dataframe by the "id" field (so that it is always ordered the same way)
    # and then drop the id field and the year field 
    shape_array = shape_array.sort_values(by="cluster_id")[['cluster_id']]
    
    # Convert the data into a numpy array where each       
    # Array_values has the following shape (after the below code)
    # (number_points, 1, num_spectral_bands)
    shape_array = shape_array.to_numpy()
    
    # Reshape the array into something more square
    shape_array = np.reshape(shape_array, [num_rows, num_cols])
    
    # This evaluation makes x/y arrays for all cell values in a range.
    # I knew how many points I should get for ==1000 and wanted to test it.
    (y_index, x_index) = np.nonzero(shape_array)
     
    # Init the shapefile stuff..
    srs = osgeo.osr.SpatialReference()
    srs.ImportFromWkt(example_raster.GetProjection())
    driver = osgeo.ogr.GetDriverByName('ESRI Shapefile')
    
    # Create the output shapefile
    shape_data = driver.CreateDataSource(output_directory_shp + "abstract_image_ids_revised_ids.shp")
    layer = shape_data.CreateLayer('ogr_pts', srs, osgeo.ogr.wkbPoint)

    # Define the ID field we will use
    id_definition = osgeo.ogr.FieldDefn('cluster_id', osgeo.ogr.OFTInteger)
    layer.CreateField(id_definition)
    layer_definition = layer.GetLayerDefn()

    # Iterate over the Numpy points..
   
    i = 0
    #there is an issue here when kmeans does not produce the number of expected clusters where the associated ids are incorrect
    #change this so its not chronological but instead pulls from the cluster ids
    
    for col in range(0, num_cols):
        
        for row in range(0, num_rows):
            # Get the X and Y displacements from the origin
            x = col * x_size + upper_left_x + (x_size / 2) # add half the cell size
            y = row * y_size + upper_left_y + (y_size / 2) # to centre the point

            # Get the ID value from the array
            id_value = shape_array[row, col].item()
        
            point = osgeo.ogr.Geometry(osgeo.ogr.wkbPoint)
            point.SetPoint(0, x, y)
        
            feature = osgeo.ogr.Feature(layer_definition)
            feature.SetGeometry(point)
            feature.SetFID(i)
            #for some reason this has to be a float, cast it as such
            feature.SetField('cluster_id', float(cluster_ids_all[i]))
            layer.CreateFeature(feature)
        
            # Increment the counter
            i = i + 1
    layer = None
    shape_data.Destroy()
    
    