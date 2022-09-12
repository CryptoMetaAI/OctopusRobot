import React, { useState } from 'react';
import {
  CodeOutlined,
  ToolOutlined,
  WalletOutlined
} from '@ant-design/icons';
import { Layout, Menu, Button } from 'antd';
import { Routes, Route, Link } from "react-router-dom";
import 'antd/dist/antd.css';
import './CreateScript.css';
import NodeConfig from './nodeConfig';
import ScriptList from './scriptList';
import AddScript from './addScript';
import Wallet from './wallet';

const { Header, Content, Footer, Sider } = Layout;

// https://www.robinwieruch.de/react-router-nested-routes/
const CreateScript = () => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <Layout
        style={{
          minHeight: '100vh',
        }}
      >
        <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
          <div> <Button className="logo" type="primary">Connect Metamask</Button> </div>
          <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline">
            <Menu.Item key="1">
                <CodeOutlined />
                <span>Scripts</span>
                <Link to="scriptList" />
            </Menu.Item>
            <Menu.Item key="2">
                <ToolOutlined />
                <span>RPC Node Config</span>
                <Link to="nodeConfig" />
            </Menu.Item>
            <Menu.Item key="3">
                <WalletOutlined />
                <span>Wallet</span>
                <Link to="wallet" />
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout className="site-layout">      
          <Header 
            theme="dark"
            className="site-layout-background"
            style={{
              padding: 0,
            }}/>
          <Content
            style={{
              margin: '10px 10px',
            }}
          >      
            <Routes>
              <Route index element={<ScriptList />} />
              <Route path="nodeConfig" element={<NodeConfig />} />
              <Route path="scriptList" element={<ScriptList />} />
              <Route path="addScript" element={<AddScript />} />
              <Route path="modifyScript" element={<AddScript />} />
              <Route path="wallet" element={<Wallet />} />
            </Routes>
          </Content>
          <Footer
            style={{
              textAlign: 'center',
            }}
          >
            Web3 Automation Script Design ©2022 Created by Sam
          </Footer>
        </Layout>
      </Layout>
  );
};

export default CreateScript;