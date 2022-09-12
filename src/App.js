
import { Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import CreateScript from './components/CreateScript';
import CreatorList from './components/CreatorList';
import NodeConfig from './components/CreateScript/nodeConfig';
import ScriptList from './components/CreateScript/scriptList';
import AddScript from './components/CreateScript/addScript';
import Wallet from './components/CreateScript/wallet';

function App() {
  return (
    <div>
      <Routes>
          <Route index element={<Home />} />
          <Route path="/" element={<Home />} />
          <Route path="createScript" element={<CreateScript />}>
            <Route index element={<ScriptList />} />
            <Route path="nodeConfig" element={<NodeConfig />} />
            <Route path="scriptList" element={<ScriptList />} />
            <Route path="addScript" element={<AddScript />} />
            <Route path="modifyScript" element={<AddScript />} />
            <Route path="wallet" element={<Wallet />} />
          </Route>
          <Route path="creatorList" element={<CreatorList />} />
      </Routes>
    </div>
  );
}

export default App;
