import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from 'gsap';
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import FadeContent from '../components/bits/FadeContent.jsx';
import SplitText from '../components/bits/SplitText.jsx';
import SplittyLogo from "../logos/SplittyLogo.jsx";
import { Loading } from "../components/Loading.jsx";
import Welcome from "../components/Welcome.jsx";
import { UserDashboard } from "../components/UserDashboard.jsx";


export const Home = () => {
	const { store } = useGlobalReducer();

	return (
		<>
			{store.jwt ? <UserDashboard /> : <Welcome />}
		</>
	);
};