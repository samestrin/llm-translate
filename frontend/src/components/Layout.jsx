import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Menu as MenuIcon, X, Home, History } from 'lucide-react';

const Layout = () => {
  const location = useLocation();
  
  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'History', href: '/history', icon: History }
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">LLM Translate</h1>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  isActive(item.href)
                    ? 'bg-blue-700'
                    : 'hover:bg-blue-500'
                }`}
              >
                <item.icon className="h-4 w-4 mr-1" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
          
          {/* Mobile Menu */}
          <div className="md:hidden">
            <Menu as="div" className="relative inline-block text-left">
              <MenuButton className="p-2 rounded-md bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-white">
                {({ active }) => (
                  active ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />
                )}
              </MenuButton>
              <MenuItems anchor="bottom-end" className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                <div className="py-1">
                  {navigation.map((item) => (
                    <MenuItem key={item.name}>
                      {({ focus }) => (
                        <Link
                          to={item.href}
                          className={`${
                            focus ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                          } ${
                            isActive(item.href) ? 'bg-blue-50' : ''
                          } flex items-center px-4 py-2 text-sm`}
                        >
                          <item.icon className="h-4 w-4 mr-2" />
                          <span>{item.name}</span>
                        </Link>
                      )}
                    </MenuItem>
                  ))}
                </div>
              </MenuItems>
            </Menu>
          </div>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto p-4">
        <Outlet />
      </main>
      
      <footer className="bg-gray-100 p-4">
        <div className="container mx-auto text-center text-gray-600">
          <p>© {new Date().getFullYear()} LLM Translate. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;