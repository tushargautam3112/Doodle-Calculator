import { RouterProvider, createBrowserRouter } from "react-router-dom";
import {MantineProvider} from "@mantine/core"
import '@mantine/core/styles.css'
import Home from './screens/homescreen'
import '../src/index.css'

const paths = [

  {
    path: '/',
    element: (
      <Home/>
    ),
  },
]

const BrowserRouter = createBrowserRouter(paths);

const App = () => {
  return (
    <MantineProvider>
      <RouterProvider router={BrowserRouter}/>
    </MantineProvider>
  )
}

export default App;