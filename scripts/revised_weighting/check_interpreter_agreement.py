import os 
import sys 
import glob
import pandas as pd 
import matplotlib.pyplot as plt 
import seaborn as sns 


"""Check the agreement of interpreters classifying best model configurations for LTOP. 
There are some options that were classified by multiple interpreters, check how often 
they came to the same conclusion. 
"""

def calc_weights(fn,vert='rankVscore', AIC='rankAICc', total=720): 
	"""Takes the output of interpreters work and calculates weights from pareto curve."""
	df = pd.read_csv(fn)
	#calc weights 
	df['vWeight'] = df[vert]/total
	df['aicWeight'] = df[AIC]/total

	print(df[id_col].unique())

	return df

def plot_interps(df,vert='vWeight', AIC='aicWeight'): 
	num_plots = len(df['user'].unique())
	
	fig,ax=plt.subplots(num_plots)


		sns.histplot(x=vert,
					#y=vert,
					data=df,
					#color='darkgreen', 
					hue='user',
					multiple='stack', 
					ax=ax1, 
					#cumulative=True)
					)


if __name__ == '__main__':
	interp_out = "/vol/v1/proj/LTOP_mekong/csvs/00_weighting_scheme/ltop_interpreted_database_v4.csv"

	collect_ids(interp_out)