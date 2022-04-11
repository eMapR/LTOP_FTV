import os 
import sys
import matplotlib.pyplot as plt 
import pandas as pd 
import seaborn as sns 
import numpy as np 
import glob 

def plot_coeff(c1_df,c2_df,c2_df_no_roy,col='lt_bps'): 

	fig,(ax1,ax2,ax3) = plt.subplots(3,figsize=(6,4),sharex=True,sharey=True)

	ax1.hist(c1_df[col], 
			 # bins=6,
			 bins=range(6),
			 align='mid')
	ax2.hist(c2_df[col],
			bins=range(6),
			align='mid'	
		    )
	ax3.hist(c2_df_no_roy[col],
			 bins=range(6),
			 align='mid'
		     )
	# sns.histplot(x=col,
	# 			data=c1_df,
	# 			ax=ax1, 
	# 			# binrange=((0.5,1.5),(1.5,2.5),(2.5,3.5),(3.5,4.5))
	# 			)
	# sns.histplot(x=col,
	# 			data=c2_df,
	# 			ax=ax2,
	# 			# binrange=((0.5,1.5),(1.5,2.5),(2.5,3.5),(3.5,4.5))
	# 			)

	# sns.histplot(x=col,
	# 			data=c2_df_no_roy,
	# 			ax=ax3,
	# 			# binrange=((0.5,1.5),(1.5,2.5),(2.5,3.5),(3.5,4.5))
	# 			)


	ax1.annotate('n = 1000',xy=(0.9,0.8),xycoords='axes fraction')
	ax2.annotate('n = 1000',xy=(0.9,0.8),xycoords='axes fraction')
	ax3.annotate('n = 1000',xy=(0.9,0.8),xycoords='axes fraction')
	ax1.set_title('Collection 1 w/ Roy coeff')
	ax2.set_title('Collection 2 w/ Roy coeff')
	ax3.set_title('Collection 2 w/o Roy coeff')
	ax1.set_xlabel('')
	ax2.set_xlabel('')
	ax3.set_xlabel('')
	plt.show()
	plt.close('all')



def plot_scatter(df,output_dir): 
	fig,ax = plt.subplots(2,2,figsize=(6,4),sharex=True,sharey=True,gridspec_kw={'wspace':0.0,'hspace':0.0})

	ax = ax.flatten()
	# roy_df = df.loc[df['roy_val']=='roy']
	# no_roy_df = df.loc[df['roy_val']=='no_roy']
	for year,x in zip(range(2012,2016),range(4)): 
		yr_df = df.loc[df['year']==str(year)]
		#split the data into roy and no roy so we can color based on obvs
		if x < 3: 
			leg_bool = False
		else: 
			leg_bool = True
		#this plots everything individually, change it so that it just plots deltas 
		# sns.scatterplot(x='c1_val',
		# 			    y='c2_val',
		# 			    data=yr_df,#roy_df.loc[roy_df['year']==str(year)],
		# 			    hue='roy_val',
		# 			    s=100, 
		# 			    ax=ax[x],
		# 			    legend=leg_bool
		# 	           )
		#I am for plotting deltas, this assumes the input df is merged below
		sns.scatterplot(x='c1_val',
					    y='delta',
					    data=yr_df,#no_roy_df.loc[no_roy_df['year']==str(year)],
					    # hue='roy_val',
					    s=100, 
					    ax=ax[x]
					    # legend='brief'
			           )
		
		#label deltas 
		for i,point in yr_df.iterrows(): 
			ax[x].text(point['c1_val']+2, point['delta']-1, str(point['id']),fontsize=7)

		#use if you're not using deltas but plotting everything
		# for i, point in yr_df.iterrows():
		# 	if point['roy_val'] == 'roy': 
		# 		print('using roy')
		# 		ax[x].text(point['c1_val']+2, point['c2_val']-1, str(point['id']),fontsize=7)
		# 	else: 
		# 		print('not using roy')
		# 		ax[x].text(point['c1_val']-7, point['c2_val']-1, str(point['id']),fontsize=7)
		
		ax[x].annotate(f'Year: {year}',xy=(0.4,0.9),xycoords='axes fraction')

		ax[x].annotate('n = 2000',xy=(0.1,0.9),xycoords='axes fraction')

		ax[x].set_xlabel('Collection 1')
		ax[x].set_ylabel('Collection 2')
	# ax[3].legend()
	plt.show()
	plt.close('all')
	# plt.savefig(os.path.join(output_dir,'roy_coeff_vis_draft1.png'))

def plot_barplot(df): 
	fig,ax = plt.subplots(2,2,figsize=(6,4),sharex=True,sharey=True,gridspec_kw={'wspace':0.0,'hspace':0.0})

	ax = ax.flatten()
	# roy_df = df.loc[df['roy_val']=='roy']
	# no_roy_df = df.loc[df['roy_val']=='no_roy']
	for year,x in zip(range(2012,2016),range(4)): 
		yr_df = df.loc[df['year']==str(year)]
		#split the data into roy and no roy so we can color based on obvs
		if x < 3: 
			leg_bool = False
		else: 
			leg_bool = True

		ax[x].bar(yr_df['id'],yr_df['delta'])

		ax[x].annotate(f'Year: {year}',xy=(0.4,0.9),xycoords='axes fraction')

		ax[x].annotate('n = 2000',xy=(0.1,0.9),xycoords='axes fraction')

		# ax[x].set_xlabel('Collection 1')
	# ax[0].set_ylabel('Collection 2')
	# ax[2].set_ylabel('Collection 2')
	# fig.text(0.5, 0.04, 'common X', ha='center')
	fig.text(0.04, 0.5, 'Collection 2 delta (roy-no roy)', va='center', rotation='vertical')
	# ax[3].legend()
	plt.show()
	plt.close('all')

def plot_boxplot(c1_df,c2_df): 
	fig,(ax1,ax2) = plt.subplots(1,2,figsize=(6,4),sharex=True,sharey=True,gridspec_kw={'wspace':0.0,'hspace':0.0})
	
	# df1 = c1_df[[c for c in c1_df.columns if str(year) in c]]
	# print('the df is')
	# print(df1)
	# print(df1.columns)
	# df2 = c2_df[[c for c in c2_df.columns if str(year) in c]]

	c1_df.boxplot(column=list(c1_df.columns),ax=ax1,showfliers=False)
	c2_df.boxplot(column=list(c2_df.columns),ax=ax2,showfliers=False)

	ax1.set_title('Collection 1')
	ax2.set_title('Collection 2')
	ax1.set_ylabel('yrs w/ valid composite (max=36)')
	# for t1,t2 in zip(ax1.get_xticklabels(),ax2.get_xticklabels()):
	# 	t1.set_rotation(90)
	# 	t2.set_rotation(90)
	plt.show()
	plt.close('all')

if __name__ == '__main__':
	# c1 = pd.read_csv("/vol/v1/proj/LTOP_mekong/csvs/00_collection_2_conversion/testing_collection_1_output_1000_pts_w_roy_coeff_2013_only.csv")
	# c2_w_roy = pd.read_csv("/vol/v1/proj/LTOP_mekong/csvs/00_collection_2_conversion/testing_collection_2_output_1000_pts_w_roy_coeff_2013_only.csv")
	# c2_wo_roy = pd.read_csv("/vol/v1/proj/LTOP_mekong/csvs/00_collection_2_conversion/testing_collection_2_output_1000_pts_no_roy_coeff_2013_only.csv")

	input_dir = "/vol/v1/proj/LTOP_mekong/csvs/00_collection_2_conversion/places/"
	output_dir = "/vol/v1/proj/LTOP_mekong/figures/collection_2/"
	places = ['Cambodia', 
              'Burma',
              'Guatemala', 
              'Colombia', 
              'Brazil', 
              # 'Algeria', #looks like this is kind of any outlier and is skewing the figures
              'Sudan', 
              'Tanzania', 
              'France', 
              'Norway', 
              'Pakistan',
              'Oregon', 
              'Washington',
              'Arizona',
              'Minnesota',
              'Ohio',
              'Maine',
              'Virginia',
              'Georgia',
              'Colorado'
             ]
	names = {'Cambodia':'Cm',
			 'Burma':'Bu',
	         'Guatemala':'Gu', 
	         'Colombia':'Col',
	         'Brazil':'Br',
	         'Sudan':'Su',
	         'Tanzania':'Tz',
	         'France':'Fr',
	         'Norway':'No', 
	         'Pakistan':'Pk', 
	         'Oregon':'OR', 
	         'Washington':'WA', 
	         'Arizona':'AZ', 
	         'Minnesota':'MN', 
	         'Ohio':'OH', 
	         'Maine':'ME', 
	         'Virginia':'VA', 
	         'Georgia':'GA', 
	         'Colorado':'CO'
	         }
	
	col = 'lt_bps'
	files = glob.glob(input_dir+'*.csv')
	# c1_ls = []
	# c2_w_roy_ls = []
	# c2_wo_roy_ls = []
	# roy_val_ls = []
	output_data = []
	c1_data = {}
	c2_data = {}
	roy_output = []
	no_roy_output = []
	for i in sorted(places): 
		print('The place is: ',i)
		#first get the three files for each country 
		places_files = sorted([f for f in files if i in f])
		
		for year in range(2012,2016): 
			print('The year is: ',year)
			year = str(year)
			#get the collection 1 file
			c1 = [f for f in places_files if ('collection_1' in (os.path.split(f)[1])) & (year in os.path.split(f)[1])][0]
			#get collection 2 using roy coeff
			c2_roy = [f for f in places_files if ('w_roy' in f) & ('collection_2' in os.path.split(f)[1]) & (year in os.path.split(f)[1])][0]
			#get collection 2 w/o using the roy coeff
			c2_no_roy = [f for f in places_files if ('collection_2' in os.path.split(f)[1]) & ('no_roy' in f) & (year in os.path.split(f)[1])][0]
		
			# print(c1)
			# print(c2_roy)
			# print(c2_no_roy)

			#now convert these files to dfs and get the sum of the year breakpoint instances 
			c1 = pd.read_csv(c1)#[col].sum()
			c2_roy = pd.read_csv(c2_roy)#[col].sum()
			c2_no_roy = pd.read_csv(c2_no_roy)#[col].sum()

			#just merge these? 
			# merged = c1.merge(c2_roy,on='place',how='inner')
			# merged = merged.merge(c2_no_roy,on='place',how='inner')
			# print('The merge looks like: ')
			# print(merged)

			#get the distribution of observations for each place. These will be the same for different years 
			#because its just taking the n from the 4xn output of the LT array so just take the first year since it doesn't matter
			if year == '2012': 
				c1_data.update({f'{names[i]}':c1['LandTrendr']})
				c2_data.update({f'{names[i]}':c2_roy['LandTrendr']})
			else: 
				pass

			#now make a dict that holds all the info for this country 
			# output_data.append({'place':i,
			# 	                'c1_val':c1[col].sum(),
			# 	                'c1_obs':c1['LandTrendr'].mean(),
			# 	                'roy_val':'roy',
			# 	                'c2_val':c2_roy[col].sum(),
			# 	                'c2_obs':c2_roy['LandTrendr'].mean(),
			# 	                'year':year,
			# 	                'id':names[i]
			# 	                })
			# output_data.append({'place':i,
			# 	                'c1_val':c1[col].sum(),
			# 	                'c1_obs':c1['LandTrendr'].mean(), 
			# 	                'roy_val':'no_roy',
			# 	                'c2_val':c2_no_roy[col].sum(),
			# 	                'c2_obs':c2_no_roy['LandTrendr'].mean(), 
			# 	                'year':year, 
			# 	                'id':names[i]
			# 	                })

			roy_output.append({'place':i,
				                'r_c1_val':c1[col].sum(),
				                # 'r_c1_obs':c1['LandTrendr'].mean(),
				                'r_roy_val':'roy',
				                'r_c2_val':c2_roy[col].sum(),
				                # 'r_c2_obs':c2_roy['LandTrendr'].mean(),
				                'year':year,
				                'r_id':names[i]
				                })
			no_roy_output.append({'place':i,
				                'c1_val':c1[col].sum(),
				                # 'c1_obs':c1['LandTrendr'].mean(), 
				                'roy_val':'no_roy',
				                'c2_val':c2_no_roy[col].sum(),
				                # 'c2_obs':c2_no_roy['LandTrendr'].mean(), 
				                'year':year, 
				                'id':names[i]
				                })
	# df = pd.DataFrame(output_data)
	df1 = pd.DataFrame(roy_output)
	df2 = pd.DataFrame(no_roy_output)

	print(df1)
	print(df2)
	
	merged = df1.merge(df2, on=['place','year'],how='inner')
	merged['delta'] = merged['r_c2_val']-merged['c2_val']
	print(merged[['c2_val','r_c2_val','delta']])
	# df['delta'] = df['c2_val'].diff()
	# print('the df looks like')
	# print(df[['place','c2_val','roy_val','delta']])
	c1_df = pd.DataFrame().from_dict(c1_data)
	c2_df = pd.DataFrame().from_dict(c2_data)

	# print(c1_df)
	# plot_boxplot(c1_df,c2_df)
	#plot_coeff(c1,c2_w_roy,c2_wo_roy)
	# plot_scatter(merged,output_dir)
	plot_barplot(merged)
	