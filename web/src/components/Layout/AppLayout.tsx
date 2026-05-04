import React, { useState } from "react";
import { Layout, Menu } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  FileTextOutlined,
  ApiOutlined,
  CodeOutlined,
  PlayCircleOutlined,
  BarChartOutlined,
} from "@ant-design/icons";

const { Sider, Content } = Layout;

const menuItems = [
  { key: "/cases", icon: <FileTextOutlined />, label: "用例管理" },
  { key: "/apis", icon: <ApiOutlined />, label: "接口管理" },
  { key: "/scripts", icon: <CodeOutlined />, label: "脚本管理" },
  { key: "/execution", icon: <PlayCircleOutlined />, label: "自动化执行" },
  { key: "/reports", icon: <BarChartOutlined />, label: "测试报告" },
];

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const selectedKey =
    menuItems.find((item) => location.pathname.startsWith(item.key))?.key ||
    "/cases";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        aria-label="主导航侧边栏"
      >
        <div
          style={{
            height: 32,
            margin: 16,
            background: "rgba(255, 255, 255, 0.2)",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: "bold",
            fontSize: collapsed ? 12 : 14,
          }}
        >
          {collapsed ? "TA" : "测试平台"}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Content style={{ margin: "16px", overflow: "auto" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
