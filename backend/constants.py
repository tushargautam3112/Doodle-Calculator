from dotenv import load_dotenv
import os
load_dotenv()

GEM_API_KEY=os.getenv('GEM_API_KEY')
SERVER_URL = 'localhost'
PORT = 8000
ENV  = 'dev'