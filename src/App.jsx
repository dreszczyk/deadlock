import React, { Component } from 'react';
import styled from 'styled-components';
import 'antd/dist/antd.css';
import io from 'socket.io-client';
import {
    BrowserRouter as Router,
    Route
} from 'react-router-dom';
import {
    Layout,
    Typography,
} from 'antd';
import {
    Home,
    Room,
    GameRoom,
} from './pages';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

const StyledContent = styled(Content)`
    padding: 0 50px;
    position: relative;
    top: 64px;
`;

const StyledFooter = styled(Footer)`
    text-align: center;
    position: relative;
    top: 64px;
`;

const StyledTitle = styled(Title)`
    color: white !important;
    letter-spacing: 35px;
    text-transform: uppercase;
    line-height: 64px !important;
    margin-left: 35px; // usuwa offset po letter-spacing
`;

const HeaderStyled = styled(Header)`
    position: fixed;
    z-index: 1;
    width: 100%;
    text-align: center;
`;

const socket = io(window.location.origin);

class AppRoot extends Component {
    componentDidMount() {
        socket.on('connect', () => {
            console.log('connected');
        });
    }
    render() {
        return (
            <Layout>
                <HeaderStyled>
                    <StyledTitle level={4}>
                        deadlock
                    </StyledTitle>
                </HeaderStyled>
                <StyledContent>
                    <Router>
                        <Route
                            exact
                            path='/'
                            render={
                                (props) => <Home {...props} socket={socket} />
                            }
                        />
                        <Route
                            exact
                            path='/room/:roomId'
                            render={
                                (props) => <Room {...props} socket={socket} />
                            }
                        />
                        <Route
                            exact
                            path='/joinGame/:roomId/:playerId'
                            render={
                                (props) => <GameRoom {...props} socket={socket} />
                            }
                        />
                    </Router>
                </StyledContent>
                <StyledFooter> &copy; 2019 </StyledFooter>
            </Layout>
        );
    }
}

export default AppRoot;
