import { Route, Switch } from "wouter";
import Download from "./pages/Download";
import Subtitles from "./pages/Subtitles";
import Editor from "./pages/Editor";
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
        <Route path="/" component={Download} />
        <Route path="/trim" component={Editor} />
        <Route path="/subtitles" component={Subtitles} />

        {/* <Route path="/users/:name">
          {(params) => <>Hello, {params.name}!</>}
        </Route> */}

        {/* Default route in a switch */}
        <Route>404: No such page!</Route>
      </Switch>
    </>
  );
}
