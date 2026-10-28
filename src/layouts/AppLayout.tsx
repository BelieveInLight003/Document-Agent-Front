import {
  ApartmentOutlined,
  CommentOutlined,
  DashboardOutlined,
  FileTextOutlined,
  LogoutOutlined,
  SearchOutlined,
  SettingOutlined,
  ShareAltOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Dropdown, Empty, Layout, Menu, type MenuProps } from 'antd';
import { useMemo } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearSession, useAuth } from '../auth';
import { Logo } from '../components/Logo';
import { can, pathAllowed, visibleModules } from '../utils';

const { Sider, Header, Content } = Layout;

const MODULE_ICONS = {
  '/': <DashboardOutlined />,
  '/documents': <FileTextOutlined />,
  '/search': <SearchOutlined />,
  '/chat': <CommentOutlined />,
  '/graph': <ShareAltOutlined />,
  '/profile': <UserOutlined />,
  '/admin/users': <UserOutlined />,
  '/admin/roles': <SettingOutlined />,
  '/admin/teams': <ApartmentOutlined />,
  '/admin/reviews': <FileTextOutlined />,
};

function selectedKey(pathname: string) {
  if (pathname.startsWith('/admin/users')) return '/admin/users';
  if (pathname.startsWith('/admin/roles')) return '/admin/roles';
  if (pathname.startsWith('/admin/teams')) return '/admin/teams';
  if (pathname.startsWith('/admin/reviews')) return '/admin/reviews';
  if (pathname.startsWith('/documents')) return '/documents';
  if (pathname.startsWith('/search')) return '/search';
  if (pathname.startsWith('/chat')) return '/chat';
  if (pathname.startsWith('/graph')) return '/graph';
  if (pathname.startsWith('/profile')) return '/profile';
  return '/';
}

export function AppLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const items = useMemo(() => {
    const visible = visibleModules(user);
    const menu: MenuProps['items'] = visible
      .filter((item) => item.group !== 'admin')
      .map((item) => ({
        key: item.path,
        icon: MODULE_ICONS[item.path as keyof typeof MODULE_ICONS],
        label: item.label,
      }));
    const admin = visible
      .filter((item) => item.group === 'admin')
      .map((item) => ({
        key: item.path,
        icon: MODULE_ICONS[item.path as keyof typeof MODULE_ICONS],
        label: item.label,
      }));
    if (admin.length > 0) {
      menu.push({
        key: 'admin',
        icon: <SettingOutlined />,
        label: '管理后台',
        children: admin,
      });
    }
    return menu;
  }, [user]);

  const allowed = pathAllowed(user, pathname);
  const fallback = visibleModules(user)[0]?.path ?? null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} theme="dark" breakpoint="lg" collapsedWidth={72} style={{ background: '#0f2744' }}>
        <Logo />
        <Menu
          theme="dark"
          mode="inline"
          style={{ background: '#0f2744' }}
          selectedKeys={[selectedKey(pathname)]}
          defaultOpenKeys={pathname.startsWith('/admin') ? ['admin'] : []}
          items={items}
          onClick={({ key }) => {
            if (key !== 'admin') navigate(key);
          }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <span style={{ color: '#64748b' }}>AI 知识管理平台</span>
          <Dropdown
            menu={{
              items: [
              ...(can(user, 'profile')
                ? [{ key: 'profile', icon: <UserOutlined />, label: '个人中心' }]
                : []),
              { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
            ],
              onClick: ({ key }) => {
                if (key === 'profile') navigate('/profile');
                if (key === 'logout') {
                  clearSession();
                  navigate('/login');
                }
              },
            }}
          >
            <span style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Avatar style={{ background: '#1d4ed8' }}>
                {(user?.realName || user?.username || '用').slice(0, 1)}
              </Avatar>
              {user?.realName || user?.username}
            </span>
          </Dropdown>
        </Header>
        <Content style={{ padding: 24 }}>
          {allowed ? (
            <Outlet />
          ) : fallback && fallback !== pathname ? (
            <Navigate to={fallback} replace />
          ) : (
            <Empty description="当前账号没有可访问的模块" />
          )}
        </Content>
      </Layout>
    </Layout>
  );
}
