import { Route, Switch } from "wouter";
import DownloadPage from "./pages/DownloadPage";
import SubtitlesPage from "./pages/SubtitlesPage";
import EditorPage from "./pages/Editor";
import NavBar from "./components/NavBar";

export default function App() {
  return (
    <>
      <NavBar />

      {/* 
      Routes below are matched exclusively -
      the first matched route gets rendered
    */}
      <Switch>
        <Route path="/" component={DownloadPage} />
        <Route path="/trim" component={EditorPage} />
        <Route path="/subtitles" component={SubtitlesPage} />

        {/* <Route path="/users/:name">
          {(params) => <>Hello, {params.name}!</>}
        </Route> */}

        {/* Default route in a switch */}
        <Route>404: No such page!</Route>
      </Switch>
    </>
  );
}
