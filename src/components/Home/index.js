import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import logo from './logo.jpeg';
import './Home.css';

export default class Home extends Component {
    
    render() {
        return (
            <div className="App">
              <header className="App-header">
                <img src={logo} className="App-logo" alt="logo" />
                <p>
                  Web3 Automation Scripts for Creators and Users
                </p>
                <Link
                  className="App-link"
                  to='/CreateScript'
                >
                  Create Script
                </Link>
                <Link
                  className="App-link"
                  to='/CreatorList'
                >
                  Creator List
                </Link>
              </header>
            </div>
          );   
    }
}